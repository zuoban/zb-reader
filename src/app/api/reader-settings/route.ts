import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { db } from "@/lib/db";
import { readerSettings } from "@/lib/db/schema";
import { getAuthUserId, serverError, validateJson } from "@/lib/api-utils";
import { readerSettingsSchema } from "@/lib/validations";
import {
  clampFontSize,
  clampPageWidth,
  clampTtsRate,
  clampTtsPitch,
  clampTtsVolume,
  clampLegadoRate,
  normalizeMicrosoftPreloadCount,
  isValidFontFamily,
} from "@/lib/utils";

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
  ttsHighlightColor: "#3b82f6",
  autoScrollToActive: true,
  flipMode: "scroll" as const,
  ttsEngine: "browser" as const,
  legadoRate: 50,
  legadoConfigId: null,
  legadoPreloadCount: 3,
  ttsImmersiveMode: false,
  ttsHighlightStyle: "indicator" as const,
};

export function clampReaderSettingNumber(
  value: unknown,
  min: number,
  max: number,
  fallback: number
): number {
  const numericValue = Number(value ?? fallback);
  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, numericValue));
}

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
    ttsHighlightColor: settings.ttsHighlightColor || "#3b82f6",
    autoScrollToActive: settings.autoScrollToActive,
    flipMode: settings.flipMode || DEFAULTS.flipMode,
    ttsEngine: settings.ttsEngine || DEFAULTS.ttsEngine,
    legadoRate: settings.legadoRate,
    legadoConfigId: settings.legadoConfigId,
    legadoPreloadCount: settings.legadoPreloadCount,
    ttsImmersiveMode: settings.ttsImmersiveMode,
    ttsHighlightStyle: settings.ttsHighlightStyle || DEFAULTS.ttsHighlightStyle,
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
      fontSize: clampFontSize(payload.fontSize ?? existing?.fontSize ?? DEFAULTS.fontSize),
      pageWidth: clampPageWidth(payload.pageWidth ?? existing?.pageWidth ?? DEFAULTS.pageWidth),
      theme:
        payload.theme === "dark" || payload.theme === "sepia" || payload.theme === "light"
          ? payload.theme
          : existing?.theme ?? DEFAULTS.theme,
      fontFamily: isValidFontFamily(payload.fontFamily ?? "")
        ? payload.fontFamily
        : existing?.fontFamily ?? DEFAULTS.fontFamily,
      browserVoiceId:
        typeof payload.browserVoiceId === "string"
          ? payload.browserVoiceId
          : existing?.browserVoiceId ?? DEFAULTS.browserVoiceId,
      ttsRate: clampTtsRate(payload.ttsRate ?? existing?.ttsRate ?? DEFAULTS.ttsRate),
      ttsPitch: clampTtsPitch(payload.ttsPitch ?? existing?.ttsPitch ?? DEFAULTS.ttsPitch),
      ttsVolume: clampTtsVolume(payload.ttsVolume ?? existing?.ttsVolume ?? DEFAULTS.ttsVolume),
      microsoftPreloadCount: normalizeMicrosoftPreloadCount(
        payload.microsoftPreloadCount ?? existing?.microsoftPreloadCount ?? DEFAULTS.microsoftPreloadCount
      ),
      ttsHighlightColor:
        typeof payload.ttsHighlightColor === "string"
          ? payload.ttsHighlightColor
          : existing?.ttsHighlightColor ?? DEFAULTS.ttsHighlightColor,
      autoScrollToActive:
        typeof payload.autoScrollToActive === "boolean"
          ? payload.autoScrollToActive
          : existing?.autoScrollToActive ?? DEFAULTS.autoScrollToActive,
      flipMode:
        payload.flipMode === "scroll" || payload.flipMode === "page"
          ? payload.flipMode
          : existing?.flipMode ?? DEFAULTS.flipMode,
      ttsEngine:
        payload.ttsEngine === "browser" || payload.ttsEngine === "legado" || payload.ttsEngine === "microsoft"
          ? payload.ttsEngine
          : existing?.ttsEngine ?? DEFAULTS.ttsEngine,
      legadoRate: clampLegadoRate(payload.legadoRate ?? existing?.legadoRate ?? DEFAULTS.legadoRate),
      legadoConfigId:
        payload.legadoConfigId === null || typeof payload.legadoConfigId === "string"
          ? payload.legadoConfigId
          : existing?.legadoConfigId ?? DEFAULTS.legadoConfigId,
      legadoPreloadCount:
        typeof payload.legadoPreloadCount === "number" && Number.isFinite(payload.legadoPreloadCount)
          ? payload.legadoPreloadCount
          : existing?.legadoPreloadCount ?? DEFAULTS.legadoPreloadCount,
      ttsImmersiveMode:
        typeof payload.ttsImmersiveMode === "boolean"
          ? payload.ttsImmersiveMode
          : existing?.ttsImmersiveMode ?? DEFAULTS.ttsImmersiveMode,
      ttsHighlightStyle:
        payload.ttsHighlightStyle === "background" || payload.ttsHighlightStyle === "indicator"
          ? payload.ttsHighlightStyle
          : existing?.ttsHighlightStyle ?? DEFAULTS.ttsHighlightStyle,
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

    return NextResponse.json({
      settings: {
        fontSize: nextValues.fontSize,
        pageWidth: nextValues.pageWidth,
        theme: nextValues.theme,
        fontFamily: nextValues.fontFamily,
        browserVoiceId: nextValues.browserVoiceId,
        ttsRate: nextValues.ttsRate,
        ttsPitch: nextValues.ttsPitch,
        ttsVolume: nextValues.ttsVolume,
        microsoftPreloadCount: nextValues.microsoftPreloadCount,
        ttsHighlightColor: nextValues.ttsHighlightColor,
        autoScrollToActive: nextValues.autoScrollToActive,
        flipMode: nextValues.flipMode,
        ttsEngine: nextValues.ttsEngine,
        legadoRate: nextValues.legadoRate,
        legadoConfigId: nextValues.legadoConfigId,
        legadoPreloadCount: nextValues.legadoPreloadCount,
        ttsImmersiveMode: nextValues.ttsImmersiveMode,
        ttsHighlightStyle: nextValues.ttsHighlightStyle,
      },
    });
  } catch (error) {
    logger.error("api", "Update reader settings error:", error);
    return serverError("更新阅读设置失败");
  }
}
