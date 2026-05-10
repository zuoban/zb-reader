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
      <div className="flex items-center gap-2 mb-4 px-1">
        <span
          className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-30"
          style={{ color: "var(--reader-text)" }}
        >
          排版文字 · Typography
        </span>
      </div>
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
                "flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl transition-all active:scale-90 sm:h-10 sm:w-10",
                fontSize <= 12 ? "cursor-not-allowed opacity-30" : "hover:-translate-y-0.5 hover:bg-[color-mix(in_srgb,var(--reader-text)_8%,transparent)] active:opacity-80"
              )}
              style={{ background: "color-mix(in srgb, var(--reader-text) 4%, transparent)" }}
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
                "flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl transition-all active:scale-90 sm:h-10 sm:w-10",
                fontSize >= 28 ? "cursor-not-allowed opacity-30" : "hover:-translate-y-0.5 hover:bg-[color-mix(in_srgb,var(--reader-text)_8%,transparent)] active:opacity-80"
              )}
              style={{ background: "color-mix(in srgb, var(--reader-text) 4%, transparent)" }}
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
