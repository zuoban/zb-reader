import { Volume2 } from "lucide-react";
import type { BrowserVoiceOption } from "@/lib/tts";
import { cn } from "@/lib/utils";
import { SettingCard, SettingRow, CompactSelect, SliderRow } from "../ReadingSettings-shared";

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

        <SliderRow
          label="语速"
          value={ttsRate}
          min={1}
          max={2}
          step={0.1}
          onChange={onTtsRateChange}
          unit="x"
        />
        <SettingRow label="预加载段数" noBorder>
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
            <input
              type="color"
              value={ttsHighlightColor}
              onChange={(e) => onTtsHighlightColorChange(e.target.value)}
              className="w-8 h-8 rounded-xl cursor-pointer border-0 p-0 shadow-sm"
              style={{ background: "transparent" }}
            />
          </div>
        </SettingRow>
      </SettingCard>
    </section>
  );
}
