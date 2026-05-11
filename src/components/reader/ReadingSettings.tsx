"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
            ttsHighlightColor={ttsHighlightColor}
            onTtsHighlightColorChange={onTtsHighlightColorChange}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
