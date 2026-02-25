import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { readerSettings } from "@/lib/db/schema";

interface ReaderSettingsPayload {
  fontSize?: number;
  theme?: "light" | "dark" | "sepia";
  ttsEngine?: "browser" | "legado";
  browserVoiceId?: string;
  ttsRate?: number;
  ttsPitch?: number;
  ttsVolume?: number;
  microsoftPreloadCount?: number;
  legadoRate?: number;
  legadoConfigId?: string;
  legadoPreloadCount?: number;
}

const DEFAULTS = {
  fontSize: 16,
  theme: "light" as const,
  ttsEngine: "browser" as const,
  browserVoiceId: "",
  ttsRate: 1,
  ttsPitch: 1,
  ttsVolume: 1,
  microsoftPreloadCount: 3,
  legadoRate: 50,
  legadoConfigId: "",
  legadoPreloadCount: 3,
};

function toResponseShape(settings: typeof readerSettings.$inferSelect | null | undefined) {
  if (!settings) {
    return DEFAULTS;
  }

  return {
    fontSize: settings.fontSize,
    theme: settings.theme,
    ttsEngine: settings.ttsEngine,
    browserVoiceId: settings.browserVoiceId || "",
    ttsRate: settings.ttsRate,
    ttsPitch: settings.ttsPitch,
    ttsVolume: settings.ttsVolume,
    microsoftPreloadCount: settings.microsoftPreloadCount,
    legadoRate: settings.legadoRate,
    legadoConfigId: settings.legadoConfigId || "",
    legadoPreloadCount: settings.legadoPreloadCount,
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
    console.error("Get reader settings error:", error);
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
      ttsEngine:
        payload.ttsEngine === "legado" || payload.ttsEngine === "browser"
          ? payload.ttsEngine
          : existing?.ttsEngine ?? DEFAULTS.ttsEngine,
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
      legadoRate: Math.min(500, Math.max(1, Number(payload.legadoRate ?? existing?.legadoRate ?? DEFAULTS.legadoRate))),
      legadoConfigId:
        typeof payload.legadoConfigId === "string"
          ? payload.legadoConfigId
          : existing?.legadoConfigId ?? DEFAULTS.legadoConfigId,
      legadoPreloadCount: [1, 2, 3, 5].includes(Number(payload.legadoPreloadCount))
        ? Number(payload.legadoPreloadCount)
        : existing?.legadoPreloadCount ?? DEFAULTS.legadoPreloadCount,
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
    console.error("Update reader settings error:", error);
    return NextResponse.json({ error: "更新阅读设置失败" }, { status: 500 });
  }
}
