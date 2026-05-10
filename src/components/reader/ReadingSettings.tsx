"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { BrowserVoiceOption } from "@/lib/tts";
import type { FontFamily } from "@/stores/reader-settings";
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
        className="max-h-[85vh] overflow-hidden rounded-t-[32px] border-t border-[color-mix(in_srgb,var(--reader-text)_8%,transparent)] bg-[var(--reader-bg)]/98 px-0 shadow-2xl backdrop-blur-xl sm:mx-auto sm:max-w-xl xl:max-w-2xl"
        style={{ color: "var(--reader-text)" }}
      >
        <SheetHeader className="px-6 pb-2 pt-8">
          <div className="flex flex-col items-center gap-4">
            <div
              className="w-12 h-1.5 rounded-full bg-[var(--reader-text)]/10"
            />
            <div className="flex flex-col items-center gap-1">
              <SheetTitle className="font-heading text-2xl font-bold tracking-tight text-[var(--reader-text)]">
                阅读设置
              </SheetTitle>
              <p className="text-[11px] font-bold tracking-[0.2em] text-[var(--reader-text)] opacity-30 uppercase">
                Reading Preferences
              </p>
            </div>
          </div>
        </SheetHeader>

        <div className="px-5 pb-12 pt-4 max-h-[75vh] overflow-y-auto space-y-8 scrollbar-hide sm:px-8">
          {/* Typography */}
          <TypographySettings
            fontFamily={fontFamily}
            onFontFamilyChange={onFontFamilyChange}
            fontSize={fontSize}
            onFontSizeChange={onFontSizeChange}
          />

          {/* Theme */}
          <ThemeSettings theme={theme} onThemeChange={onThemeChange} />

          {/* TTS */}
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

          <div className="pt-4 flex justify-center">
            <button
              onClick={() => onOpenChange(false)}
              className="reader-liquid-control flex h-11 items-center justify-center rounded-full px-10 text-sm font-bold tracking-wide transition-all hover:-translate-y-0.5 active:scale-95"
              style={{
                background: "var(--reader-primary)",
                color: "var(--reader-bg)",
              }}
            >
              完成设置
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
