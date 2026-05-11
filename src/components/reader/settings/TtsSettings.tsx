import { cn } from "@/lib/utils";
import { SettingCard, SettingRow } from "../ReadingSettings-shared";

interface TtsSettingsProps {
  ttsHighlightColor: string;
  onTtsHighlightColorChange: (color: string) => void;
}

const HIGHLIGHT_COLORS = ["#3b82f6", "#ef4444", "#22c55e", "#eab308", "#a855f7", "#ec4899"];

export function TtsSettings({
  ttsHighlightColor,
  onTtsHighlightColorChange,
}: TtsSettingsProps) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-4 px-1">
        <span
          className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-30"
          style={{ color: "var(--reader-text)" }}
        >
          语音朗读 · Voice & Speed
        </span>
      </div>
      <SettingCard>
        <SettingRow label="高亮颜色" noBorder>
          <div className="flex gap-2.5 sm:gap-3 py-1">
            {HIGHLIGHT_COLORS.map((color) => {
              const isActive = ttsHighlightColor === color;
              return (
                <button
                  key={color}
                  onClick={() => onTtsHighlightColorChange(color)}
                  className={cn(
                    "w-6 h-6 sm:w-7 sm:h-7 rounded-full transition-all duration-300 cursor-pointer",
                    isActive 
                      ? "scale-125 shadow-[0_0_12px_rgba(0,0,0,0.2)] ring-2 ring-offset-2 ring-[var(--reader-text)]" 
                      : "hover:scale-110 opacity-70 hover:opacity-100"
                  )}
                  style={{
                    backgroundColor: color,
                    boxShadow: isActive ? `0 0 15px ${color}66` : "none",
                  }}
                />
              );
            })}
          </div>
        </SettingRow>
      </SettingCard>
    </section>
  );
}
