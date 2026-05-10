"use client";

import { Type } from "lucide-react";
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
        className="overflow-hidden rounded-t-3xl border-t border-border bg-[var(--reader-bg)] px-0 shadow-2xl sm:mx-auto sm:max-w-xl xl:max-w-2xl"
        style={{ color: "var(--reader-text)" }}
      >
        <SheetHeader className="px-6 pb-4 pt-8">
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-12 h-1 rounded-full bg-[var(--reader-text)]/10"
            />
            <SheetTitle className="font-heading text-2xl font-bold tracking-tight text-[var(--reader-text)]">
              Preferences
            </SheetTitle>
          </div>
        </SheetHeader>

        <div className="px-8 pb-12 max-h-[70vh] overflow-y-auto space-y-10 scrollbar-hide">
          {/* Typograhpy */}
          <section>
            <div className="mb-4 flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-[0.2em] text-[var(--reader-text)] opacity-40 uppercase">
                Typography
              </span>
            </div>
            <TypographySettings
              fontFamily={fontFamily}
              onFontFamilyChange={onFontFamilyChange}
              fontSize={fontSize}
              onFontSizeChange={onFontSizeChange}
            />
          </section>

          {/* Theme */}
          <section>
            <div className="mb-4 flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-[0.2em] text-[var(--reader-text)] opacity-40 uppercase">
                Appearance
              </span>
            </div>
            <ThemeSettings theme={theme} onThemeChange={onThemeChange} />
          </section>

          {/* TTS */}
          <section>
            <div className="mb-4 flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-[0.2em] text-[var(--reader-text)] opacity-40 uppercase">
                Voice & Speed
              </span>
            </div>
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
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
