import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { db } from "@/lib/db";
import { readerSettings } from "@/lib/db/schema";
import { getAuthUserId, serverError, validateJson } from "@/lib/api-utils";
import { readerSettingsSchema } from "@/lib/validations";

const DEFAULTS = {
  fontSize: 16,
  pageWidth: 100,
  theme: "light" as const,
  fontFamily: "system" as const,
  browserVoiceId: "",
  ttsRate: 1,
  ttsPitch: 1,
  ttsVolume: 1,
  microsoftPreloadCount: 5,
  ttsAutoNextChapter: false,
  ttsHighlightColor: "#3b82f6",
  autoScrollToActive: true,
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
    ttsPitch: settings.ttsPitch,
    ttsVolume: settings.ttsVolume,
    microsoftPreloadCount: settings.microsoftPreloadCount,
    ttsAutoNextChapter: settings.ttsAutoNextChapter,
    ttsHighlightColor: settings.ttsHighlightColor || "#3b82f6",
    autoScrollToActive: settings.autoScrollToActive,
  };
}

export async function GET() {
  const authResult = await getAuthUserId();
  if (authResult.error) return authResult.error;

  try {
    const settings = await db.query.readerSettings.findFirst({
      where: eq(readerSettings.userId, authResult.userId),
    });

    return NextResponse.json({ settings: toResponseShape(settings) });
  } catch (error) {
    logger.error("api", "Get reader settings error:", error);
    return serverError("获取阅读设置失败");
  }
}

export async function PUT(req: NextRequest) {
  const authResult = await getAuthUserId();
  if (authResult.error) return authResult.error;

  try {
    const validation = await validateJson(req, readerSettingsSchema);
    if (validation.error) return validation.error;
    const payload = validation.data;
    const now = new Date().toISOString().replace("T", " ").replace("Z", "");

    const existing = await db.query.readerSettings.findFirst({
      where: eq(readerSettings.userId, authResult.userId),
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
      ttsPitch: Math.min(2, Math.max(0.5, Number(payload.ttsPitch ?? existing?.ttsPitch ?? DEFAULTS.ttsPitch))),
      ttsVolume: Math.min(1, Math.max(0, Number(payload.ttsVolume ?? existing?.ttsVolume ?? DEFAULTS.ttsVolume))),
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
      autoScrollToActive:
        typeof payload.autoScrollToActive === "boolean"
          ? payload.autoScrollToActive
          : existing?.autoScrollToActive ?? DEFAULTS.autoScrollToActive,
      updatedAt: now,
    };

    if (existing) {
      await db
        .update(readerSettings)
        .set(nextValues)
        .where(and(eq(readerSettings.id, existing.id), eq(readerSettings.userId, authResult.userId)));
    } else {
      await db.insert(readerSettings).values({
        id: uuidv4(),
        userId: authResult.userId,
        ...nextValues,
      });
    }

    const updated = await db.query.readerSettings.findFirst({
      where: eq(readerSettings.userId, authResult.userId),
    });

    return NextResponse.json({ settings: toResponseShape(updated) });
  } catch (error) {
    logger.error("api", "Update reader settings error:", error);
    return serverError("更新阅读设置失败");
  }
}
