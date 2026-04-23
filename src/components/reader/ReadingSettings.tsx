"use client";

import { Volume2, Type, Palette } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { BrowserVoiceOption } from "@/lib/tts";
import type { FontFamily } from "@/stores/reader-settings";
import { cn } from "@/lib/utils";
import { TypographySettings, ThemeSettings, TtsSettings } from "./settings";

type ThemeValue = "light" | "dark" | "sepia";

interface ReadingSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  fontFamily: FontFamily;
  onFontFamilyChange: (fontFamily: FontFamily) => void;
  theme: ThemeValue;
  onThemeChange: (theme: ThemeValue) => void;
  browserVoices: BrowserVoiceOption[];
  selectedBrowserVoiceId: string;
  onSelectedBrowserVoiceIdChange: (voiceId: string) => void;
  ttsRate: number;
  onTtsRateChange: (value: number) => void;
  microsoftPreloadCount: number;
  onMicrosoftPreloadCountChange: (value: number) => void;
  ttsHighlightColor: string;
  onTtsHighlightColorChange: (color: string) => void;
}

export function ReadingSettings({
  open,
  onOpenChange,
  fontSize,
  onFontSizeChange,
  fontFamily,
  onFontFamilyChange,
  theme,
  onThemeChange,
  browserVoices,
  selectedBrowserVoiceId,
  onSelectedBrowserVoiceIdChange,
  ttsRate,
  onTtsRateChange,
  microsoftPreloadCount,
  onMicrosoftPreloadCountChange,
  ttsHighlightColor,
  onTtsHighlightColorChange,
}: ReadingSettingsProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showBackground={false}
        className="reader-liquid-surface overflow-hidden rounded-t-[28px] px-0 sm:mx-auto sm:max-w-xl xl:max-w-[850px]"
        style={{ color: "var(--reader-text)" }}
      >
        {/* Handle + Title */}
        <SheetHeader className="px-5 pb-4 pt-5 sm:px-6">
          <div className="flex flex-col items-center gap-2.5">
            <div
              className="w-10 h-1.5 rounded-full"
              style={{ background: "var(--reader-text)", opacity: 0.15 }}
            />
            <SheetTitle
              className="text-[18px] sm:text-[20px] font-bold tracking-tight"
              style={{ color: "var(--reader-text)" }}
            >
              阅读设置
            </SheetTitle>
            <p
              className="text-center text-[13px] sm:text-sm"
              style={{ color: "var(--reader-muted-text)" }}
            >
              调整排版与朗读细节，尽量不打断当前阅读节奏
            </p>
          </div>
        </SheetHeader>

        <div className="px-5 sm:px-6 pb-10 max-h-[70vh] overflow-y-auto space-y-6 scrollbar-hide">
          {/* Current preset card */}
          <div
            className="reader-liquid-control rounded-2xl px-5 py-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p
                  className="text-[13px]"
                  style={{ color: "var(--reader-muted-text)" }}
                >
                  当前阅读预设
                </p>
                <h3
                  className="mt-1.5 text-[15px] sm:text-base font-semibold leading-tight"
                  style={{ color: "var(--reader-text)" }}
                >
                  更适合久读的排版与朗读节奏
                </h3>
              </div>
              <span
                className="rounded-full px-2.5 py-1 text-[12px] font-medium"
                style={{
                  background:
                    "color-mix(in srgb, var(--reader-primary) 12%, transparent)",
                  color: "var(--reader-primary)",
                }}
              >
                {theme === "light" ? "白色" : theme === "dark" ? "深色" : "护眼"}
              </span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {[
                { label: "字号", value: `${fontSize}px` },
                { label: "语速", value: `${ttsRate.toFixed(1)}x` },
              ].map((item) => (
                <div
                  key={item.label}
                  className="reader-liquid-surface rounded-xl px-3 py-3 text-center"
                >
                  <p
                    className="text-[12px]"
                    style={{ color: "var(--reader-muted-text)" }}
                  >
                    {item.label}
                  </p>
                  <p
                    className="mt-1.5 text-[15px] font-bold"
                    style={{ color: "var(--reader-text)" }}
                  >
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 排版 */}
          <section>
            <div className="flex items-center gap-2 sm:gap-2.5 mb-3 sm:mb-3.5 px-1 sm:px-1">
              <div
                className="flex items-center justify-center w-6 h-6 rounded-lg"
                style={{
                  background: "color-mix(in srgb, var(--reader-primary) 12%, transparent)",
                }}
              >
                <Type
                  className="size-3.5 sm:size-4"
                  style={{ color: "var(--reader-primary)" }}
                />
              </div>
              <span
                className="text-[12px] sm:text-[13px] font-bold tracking-wide"
                style={{ color: "var(--reader-text)" }}
              >
                排版
              </span>
            </div>
            <TypographySettings
              fontFamily={fontFamily}
              onFontFamilyChange={onFontFamilyChange}
              fontSize={fontSize}
              onFontSizeChange={onFontSizeChange}
            />
          </section>

          {/* 主题 */}
          <ThemeSettings theme={theme} onThemeChange={onThemeChange} />

          {/* 朗读 */}
          <TtsSettings
            browserVoices={browserVoices}
            selectedBrowserVoiceId={selectedBrowserVoiceId}
            onSelectedBrowserVoiceIdChange={onSelectedBrowserVoiceIdChange}
            ttsRate={ttsRate}
            onTtsRateChange={onTtsRateChange}
            microsoftPreloadCount={microsoftPreloadCount}
            onMicrosoftPreloadCountChange={onMicrosoftPreloadCountChange}
            ttsHighlightColor={ttsHighlightColor}
            onTtsHighlightColorChange={onTtsHighlightColorChange}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
