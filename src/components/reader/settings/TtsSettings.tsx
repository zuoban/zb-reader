import { Volume2 } from "lucide-react";
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
      <div className="flex items-center gap-2 sm:gap-2.5 mb-3 sm:mb-3.5 px-1 sm:px-1">
        <div
          className="flex items-center justify-center w-6 h-6 rounded-lg"
          style={{
            background: "color-mix(in srgb, var(--reader-primary) 12%, transparent)",
          }}
        >
          <Volume2
            className="size-3.5 sm:size-4"
            style={{ color: "var(--reader-primary)" }}
          />
        </div>
        <span
          className="text-[12px] sm:text-[13px] font-bold tracking-wide"
          style={{ color: "var(--reader-text)" }}
        >
          朗读
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
            className="grid grid-cols-5 gap-1 rounded-2xl border p-1 shadow-sm"
            style={{
              background:
                "color-mix(in srgb, var(--reader-card-bg) 72%, transparent)",
              borderColor: "var(--reader-border)",
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
                    "inline-flex h-8 min-w-0 cursor-pointer items-center justify-center gap-0.5 rounded-xl px-2 text-[12px] font-semibold transition-all duration-200 sm:h-9 sm:px-3 sm:text-[13px]",
                    isActive
                      ? "shadow-[0_8px_20px_-14px_color-mix(in_srgb,var(--reader-text)_56%,transparent)]"
                      : "hover:bg-[color-mix(in_srgb,var(--reader-primary)_7%,transparent)]"
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
          <div className="flex gap-2.5">
            {HIGHLIGHT_COLORS.map((color) => {
              const isActive = ttsHighlightColor === color;
              return (
                <button
                  key={color}
                  onClick={() => onTtsHighlightColorChange(color)}
                  className={cn(
                    "w-8 h-8 rounded-xl transition-all duration-200 cursor-pointer shadow-sm",
                    isActive ? "ring-2 ring-offset-2 ring-[var(--reader-text)] scale-110" : "hover:scale-110 hover:shadow-md"
                  )}
                  style={{
                    backgroundColor: color,
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
