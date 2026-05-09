import { Palette } from "lucide-react";
import { Check } from "lucide-react";
import { themeOptions } from "../ReadingSettings-shared";

type ThemeValue = "light" | "dark" | "sepia";

interface ThemeSettingsProps {
  theme: ThemeValue;
  onThemeChange: (theme: ThemeValue) => void;
}

export function ThemeSettings({ theme, onThemeChange }: ThemeSettingsProps) {
  return (
    <section>
      <div className="flex items-center gap-2 sm:gap-2.5 mb-3 sm:mb-3.5 px-1 sm:px-1">
        <div
          className="flex items-center justify-center w-6 h-6 rounded-lg"
          style={{
            background: "color-mix(in srgb, var(--reader-primary) 12%, transparent)",
          }}
        >
          <Palette
            className="size-3.5 sm:size-4"
            style={{ color: "var(--reader-primary)" }}
          />
        </div>
        <span
          className="text-[12px] sm:text-[13px] font-bold tracking-wide"
          style={{ color: "var(--reader-text)" }}
        >
          主题
        </span>
      </div>
      <div className="flex gap-3 sm:gap-4">
        {themeOptions.map((option) => {
          const isActive = theme === option.value;
          return (
            <button
              key={option.value}
              onClick={() => onThemeChange(option.value)}
              className="relative flex flex-1 cursor-pointer flex-col items-center gap-2.5 rounded-2xl py-4 transition-all duration-200 hover:-translate-y-0.5"
              style={{
                background: option.bg,
                border: isActive
                  ? "2px solid var(--reader-primary)"
                  : `1px solid ${option.borderColor}`,
                boxShadow: isActive
                  ? "0 14px 30px -22px color-mix(in srgb, var(--reader-primary) 68%, transparent)"
                  : "0 1px 0 color-mix(in srgb, white 20%, transparent) inset",
              }}
            >
              {isActive && (
                <div
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center shadow-sm"
                  style={{ background: "var(--reader-primary)" }}
                >
                  <Check className="size-3 text-[var(--reader-bg)]" strokeWidth={3} />
                </div>
              )}

              <div className="flex flex-col gap-1 w-9 px-0.5">
                <div className="h-1.5 rounded-full" style={{ background: option.textColor, opacity: 0.5 }} />
                <div className="h-1.5 rounded-full w-3/4" style={{ background: option.textColor, opacity: 0.3 }} />
                <div className="h-1.5 rounded-full" style={{ background: option.textColor, opacity: 0.4 }} />
              </div>

              <span className="text-[13px] font-semibold" style={{ color: option.textColor }}>
                {option.label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
