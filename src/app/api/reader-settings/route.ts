import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { readerSettings } from "@/lib/db/schema";
import { unauthorized, serverError } from "@/lib/api-utils";

interface ReaderSettingsPayload {
  fontSize?: number;
  pageWidth?: number;
  theme?: "light" | "dark" | "sepia";
  fontFamily?: string;
  browserVoiceId?: string;
  ttsRate?: number;
  microsoftPreloadCount?: number;
  ttsAutoNextChapter?: boolean;
  ttsHighlightColor?: string;
}

const DEFAULTS = {
  fontSize: 16,
  pageWidth: 100,
  theme: "light" as const,
  fontFamily: "system" as const,
  browserVoiceId: "",
  ttsRate: 1,
  microsoftPreloadCount: 5,
  ttsAutoNextChapter: false,
  ttsHighlightColor: "#3b82f6",
};

const ALLOWED_FONT_FAMILIES = ["system", "serif", "sans", "kaiti"];

function toResponseShape(settings: typeof readerSettings.$inferSelect | null | undefined) {
  if (!settings) {
    return DEFAULTS;
  }

  return {
    fontSize: settings.fontSize,
    pageWidth: settings.pageWidth,
    theme: settings.theme,
    fontFamily: settings.fontFamily || DEFAULTS.fontFamily,
    browserVoiceId: settings.browserVoiceId || "",
    ttsRate: settings.ttsRate,
    microsoftPreloadCount: settings.microsoftPreloadCount,
    ttsAutoNextChapter: settings.ttsAutoNextChapter,
    ttsHighlightColor: settings.ttsHighlightColor || "#3b82f6",
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorized();
  }

  try {
    const settings = await db.query.readerSettings.findFirst({
      where: eq(readerSettings.userId, session.user.id),
    });

    return NextResponse.json({ settings: toResponseShape(settings) });
  } catch (error) {
    logger.error("api", "Get reader settings error:", error);
    return serverError("获取阅读设置失败");
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorized();
  }

  try {
    const payload = (await req.json()) as ReaderSettingsPayload;
    const now = new Date().toISOString().replace("T", " ").replace("Z", "");

    const existing = await db.query.readerSettings.findFirst({
      where: eq(readerSettings.userId, session.user.id),
    });

    const nextValues = {
      fontSize: Math.min(28, Math.max(12, Number(payload.fontSize ?? existing?.fontSize ?? DEFAULTS.fontSize))),
      pageWidth: Math.min(100, Math.max(50, Number(payload.pageWidth ?? existing?.pageWidth ?? DEFAULTS.pageWidth))),
      theme:
        payload.theme === "dark" || payload.theme === "sepia" || payload.theme === "light"
          ? payload.theme
          : existing?.theme ?? DEFAULTS.theme,
      fontFamily: ALLOWED_FONT_FAMILIES.includes(payload.fontFamily as string)
        ? (payload.fontFamily as string)
        : existing?.fontFamily ?? DEFAULTS.fontFamily,
      browserVoiceId:
        typeof payload.browserVoiceId === "string"
          ? payload.browserVoiceId
          : existing?.browserVoiceId ?? DEFAULTS.browserVoiceId,
      ttsRate: Math.min(5, Math.max(1, Number(payload.ttsRate ?? existing?.ttsRate ?? DEFAULTS.ttsRate))),
      microsoftPreloadCount: [1, 2, 3, 5, 8].includes(Number(payload.microsoftPreloadCount))
        ? Number(payload.microsoftPreloadCount)
        : existing?.microsoftPreloadCount ?? DEFAULTS.microsoftPreloadCount,
      ttsAutoNextChapter:
        typeof payload.ttsAutoNextChapter === "boolean"
          ? payload.ttsAutoNextChapter
          : existing?.ttsAutoNextChapter ?? DEFAULTS.ttsAutoNextChapter,
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
    return serverError("更新阅读设置失败");
  }
}
