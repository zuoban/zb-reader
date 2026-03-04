import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { readerSettings } from "@/lib/db/schema";

interface ReaderSettingsPayload {
  fontSize?: number;
  theme?: "light" | "dark" | "sepia";
  browserVoiceId?: string;
  ttsRate?: number;
  ttsPitch?: number;
  ttsVolume?: number;
  microsoftPreloadCount?: number;
  ttsAutoNextChapter?: boolean;
  ttsHighlightStyle?: "background" | "indicator";
  ttsHighlightColor?: string;
}

const DEFAULTS = {
  fontSize: 16,
  theme: "light" as const,
  browserVoiceId: "",
  ttsRate: 1,
  ttsPitch: 1,
  ttsVolume: 1,
  microsoftPreloadCount: 3,
  ttsAutoNextChapter: false,
  ttsHighlightStyle: "indicator" as const,
  ttsHighlightColor: "#3b82f6",
};

function toResponseShape(settings: typeof readerSettings.$inferSelect | null | undefined) {
  if (!settings) {
    return DEFAULTS;
  }

  return {
    fontSize: settings.fontSize,
    theme: settings.theme,
    browserVoiceId: settings.browserVoiceId || "",
    ttsRate: settings.ttsRate,
    ttsPitch: settings.ttsPitch,
    ttsVolume: settings.ttsVolume,
    microsoftPreloadCount: settings.microsoftPreloadCount,
    ttsAutoNextChapter: settings.ttsAutoNextChapter,
    ttsHighlightStyle: settings.ttsHighlightStyle || "indicator",
    ttsHighlightColor: settings.ttsHighlightColor || "#3b82f6",
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const settings = await db.query.readerSettings.findFirst({
      where: eq(readerSettings.userId, session.user.id),
    });

    return NextResponse.json({ settings: toResponseShape(settings) });
  } catch (error) {
    logger.error("api", "Get reader settings error:", error);
    return NextResponse.json({ error: "获取阅读设置失败" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const payload = (await req.json()) as ReaderSettingsPayload;
    const now = new Date().toISOString().replace("T", " ").replace("Z", "");

    const existing = await db.query.readerSettings.findFirst({
      where: eq(readerSettings.userId, session.user.id),
    });

    const nextValues = {
      fontSize: Math.min(28, Math.max(12, Number(payload.fontSize ?? existing?.fontSize ?? DEFAULTS.fontSize))),
      theme:
        payload.theme === "dark" || payload.theme === "sepia" || payload.theme === "light"
          ? payload.theme
          : existing?.theme ?? DEFAULTS.theme,
      browserVoiceId:
        typeof payload.browserVoiceId === "string"
          ? payload.browserVoiceId
          : existing?.browserVoiceId ?? DEFAULTS.browserVoiceId,
      ttsRate: Math.min(5, Math.max(1, Number(payload.ttsRate ?? existing?.ttsRate ?? DEFAULTS.ttsRate))),
      ttsPitch: Math.min(2, Math.max(0.5, Number(payload.ttsPitch ?? existing?.ttsPitch ?? DEFAULTS.ttsPitch))),
      ttsVolume: Math.min(1, Math.max(0, Number(payload.ttsVolume ?? existing?.ttsVolume ?? DEFAULTS.ttsVolume))),
      microsoftPreloadCount: [1, 2, 3, 5].includes(Number(payload.microsoftPreloadCount))
        ? Number(payload.microsoftPreloadCount)
        : existing?.microsoftPreloadCount ?? DEFAULTS.microsoftPreloadCount,
      ttsAutoNextChapter:
        typeof payload.ttsAutoNextChapter === "boolean"
          ? payload.ttsAutoNextChapter
          : existing?.ttsAutoNextChapter ?? DEFAULTS.ttsAutoNextChapter,
      ttsHighlightStyle:
        payload.ttsHighlightStyle === "background" || payload.ttsHighlightStyle === "indicator"
          ? payload.ttsHighlightStyle
          : existing?.ttsHighlightStyle ?? DEFAULTS.ttsHighlightStyle,
      ttsHighlightColor:
        typeof payload.ttsHighlightColor === "string"
          ? payload.ttsHighlightColor
          : existing?.ttsHighlightColor ?? DEFAULTS.ttsHighlightColor,
      updatedAt: now,
    };

    if (existing) {
      await db
        .update(readerSettings)
        .set(nextValues)
        .where(and(eq(readerSettings.id, existing.id), eq(readerSettings.userId, session.user.id)));
    } else {
      await db.insert(readerSettings).values({
        id: uuidv4(),
        userId: session.user.id,
        ...nextValues,
      });
    }

    const updated = await db.query.readerSettings.findFirst({
      where: eq(readerSettings.userId, session.user.id),
    });

    return NextResponse.json({ settings: toResponseShape(updated) });
  } catch (error) {
    logger.error("api", "Update reader settings error:", error);
    return NextResponse.json({ error: "更新阅读设置失败" }, { status: 500 });
  }
}
