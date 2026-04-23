import { memo } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FontFamily } from "@/stores/reader-settings";
import { SettingCard, SettingRow, CompactSelect, fontOptions } from "../ReadingSettings-shared";

interface TypographySettingsProps {
  fontFamily: FontFamily;
  onFontFamilyChange: (fontFamily: FontFamily) => void;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
}

export const TypographySettings = memo(function TypographySettings({
  fontFamily,
  onFontFamilyChange,
  fontSize,
  onFontSizeChange,
}: TypographySettingsProps) {
  return (
    <section>
      <SettingCard>
        <SettingRow label="字体" noBorder={false}>
          <CompactSelect
            value={fontFamily}
            onChange={(v) => onFontFamilyChange(v as FontFamily)}
            placeholder="选择字体"
            options={fontOptions}
          />
        </SettingRow>

        <div
          className="flex items-center justify-between px-4 sm:px-5 py-4 sm:py-4.5 border-b"
          style={{ borderColor: "var(--reader-border)" }}
        >
          <span
            className="text-[14px] sm:text-[15px] font-semibold tracking-tight"
            style={{ color: "var(--reader-text)" }}
          >
            字体大小
          </span>
          <div className="flex items-center gap-3 sm:gap-3.5">
            <button
              onClick={() => fontSize > 12 && onFontSizeChange(fontSize - 1)}
              disabled={fontSize <= 12}
              className={cn(
                "w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-sm",
                fontSize <= 12 ? "opacity-30 cursor-not-allowed" : "hover:scale-105 hover:shadow-md active:opacity-80"
              )}
              style={{ background: "var(--reader-card-bg)", border: "1px solid var(--reader-border)" }}
            >
              <Minus className="size-4 sm:size-[18px]" style={{ color: "var(--reader-text)" }} />
            </button>

            <span
              className="text-[17px] sm:text-lg font-bold tabular-nums w-10 sm:w-11 text-center"
              style={{ color: "var(--reader-primary)" }}
            >
              {fontSize}
            </span>

            <button
              onClick={() => fontSize < 28 && onFontSizeChange(fontSize + 1)}
              disabled={fontSize >= 28}
              className={cn(
                "w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-sm",
                fontSize >= 28 ? "opacity-30 cursor-not-allowed" : "hover:scale-105 hover:shadow-md active:opacity-80"
              )}
              style={{ background: "var(--reader-card-bg)", border: "1px solid var(--reader-border)" }}
            >
              <Plus className="size-4 sm:size-[18px]" style={{ color: "var(--reader-text)" }} />
            </button>
          </div>
        </div>

        <div className="flex items-end justify-between px-5 sm:px-6 py-3.5 sm:py-4 border-b" style={{ borderColor: "var(--reader-border)" }}>
          {[12, 16, 20, 24, 28].map((s) => {
            const isActive = fontSize === s;
            return (
              <button
                key={s}
                onClick={() => onFontSizeChange(s)}
                className="flex flex-col items-center gap-2 cursor-pointer transition-transform active:scale-90 group"
              >
                <span
                  style={{
                    fontSize: s * 0.65,
                    color: isActive ? "var(--reader-primary)" : "var(--reader-text)",
                    opacity: isActive ? 1 : 0.4,
                    fontWeight: isActive ? 700 : 500,
                    lineHeight: 1,
                    transition: "all 0.2s ease",
                  }}
                >
                  文
                </span>
                <div
                  className="w-2 h-2 rounded-full transition-all duration-200"
                  style={{
                    background: isActive ? "var(--reader-primary)" : "var(--reader-text)",
                    opacity: isActive ? 1 : 0.15,
                    transform: isActive ? "scale(1.4)" : "scale(1)",
                  }}
                />
              </button>
            );
          })}
        </div>
      </SettingCard>
    </section>
  );
});
