import type { BrowserVoiceOption } from "@/lib/tts";
import { cn } from "@/lib/utils";
import { SettingCard, SettingRow, CompactSelect } from "../ReadingSettings-shared";

interface TtsSettingsProps {
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

const HIGHLIGHT_COLORS = ["#3b82f6", "#ef4444", "#22c55e", "#eab308", "#a855f7", "#ec4899"];
const TTS_RATE_OPTIONS = [1, 1.25, 1.5, 1.75, 2];

export function TtsSettings({
  browserVoices,
  selectedBrowserVoiceId,
  onSelectedBrowserVoiceIdChange,
  ttsRate,
  onTtsRateChange,
  microsoftPreloadCount,
  onMicrosoftPreloadCountChange,
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
        <SettingRow label="语音包">
          <CompactSelect
            value={selectedBrowserVoiceId}
            onChange={onSelectedBrowserVoiceIdChange}
            placeholder="选择语音"
            options={
              browserVoices.length === 0
                ? [{ value: "__none", label: "未检测到语音", disabled: true }]
                : browserVoices.map((v) => ({ value: v.id, label: v.name }))
            }
          />
        </SettingRow>

        <SettingRow label="语速">
          <div
            className="grid grid-cols-5 gap-1 rounded-2xl border p-1"
            style={{
              background:
                "color-mix(in srgb, var(--reader-card-bg) 50%, transparent)",
              borderColor: "color-mix(in srgb, var(--reader-border) 72%, transparent)",
            }}
          >
            {TTS_RATE_OPTIONS.map((rate) => {
              const isActive = Math.abs(ttsRate - rate) < 0.05;
              return (
                <button
                  key={rate}
                  type="button"
                  onClick={() => onTtsRateChange(rate)}
                  className={cn(
                    "inline-flex h-8 min-w-0 cursor-pointer items-center justify-center gap-0.5 rounded-xl px-2 text-[11px] font-bold transition-all duration-200 sm:h-9 sm:px-3 sm:text-[12px]",
                    isActive
                      ? "shadow-[0_10px_24px_-18px_color-mix(in_srgb,var(--reader-primary)_72%,transparent)]"
                      : "hover:bg-[color-mix(in_srgb,var(--reader-primary)_8%,transparent)]"
                  )}
                  style={{
                    background: isActive
                      ? "var(--reader-primary)"
                      : "transparent",
                    color: isActive ? "var(--reader-bg)" : "var(--reader-text)",
                  }}
                >
                  <span className="tabular-nums">
                    {Number.isInteger(rate) ? rate : rate.toFixed(2).replace(/0$/, "")}
                  </span>
                  <span>倍</span>
                </button>
              );
            })}
          </div>
        </SettingRow>
        <SettingRow label="预加载段数">
          <CompactSelect
            value={String(microsoftPreloadCount)}
            onChange={(v) => onMicrosoftPreloadCountChange(Number(v))}
            options={[
              { value: "1", label: "1 段" },
              { value: "2", label: "2 段" },
              { value: "3", label: "3 段" },
              { value: "5", label: "5 段" },
              { value: "8", label: "8 段" },
            ]}
          />
        </SettingRow>

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
