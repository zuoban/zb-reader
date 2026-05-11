"use client";

import { useMemo } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BrowserVoiceOption } from "@/lib/tts";

interface VoiceOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface VoiceGroup {
  label: string;
  voices: VoiceOption[];
}

const EMPTY_GROUP: VoiceGroup[] = [
  { label: "暂无可用语音", voices: [{ value: "__empty__", label: "暂无可用语音", disabled: true }] },
];

function useVoiceGroups(browserVoices: BrowserVoiceOption[], selectedBrowserVoiceId: string) {
  return useMemo(() => {
    if (browserVoices.length === 0) {
      return {
        activeVoiceLabel: "默认语音",
        voiceGroups: EMPTY_GROUP,
        selectedVoiceValue: "__empty__",
      };
    }

    const grouped = new Map<string, typeof browserVoices>();
    browserVoices.forEach((voice) => {
      const lang = voice.lang.startsWith("zh") ? "中文" : voice.lang.startsWith("en") ? "英文" : "其他";
      if (!grouped.has(lang)) grouped.set(lang, []);
      grouped.get(lang)!.push(voice);
    });

    const sortedGroups = Array.from(grouped.entries())
      .sort(([a], [b]) => {
        const order = { "中文": 0, "英文": 1, "其他": 2 };
        return (order[a as keyof typeof order] ?? 2) - (order[b as keyof typeof order] ?? 2);
      })
      .map(([label, voices]) => ({
        label,
        voices: voices.map((v) => ({ value: v.id, label: v.name, disabled: false })),
      }));

    const activeLabel = browserVoices.find((v) => v.id === selectedBrowserVoiceId)?.name ?? "默认语音";
    const selectedValue = browserVoices.some((v) => v.id === selectedBrowserVoiceId)
      ? selectedBrowserVoiceId
      : browserVoices[0]?.id ?? "__empty__";

    return { activeVoiceLabel: activeLabel, voiceGroups: sortedGroups, selectedVoiceValue: selectedValue };
  }, [browserVoices, selectedBrowserVoiceId]);
}

interface VoicePackagePickerProps {
  browserVoices: BrowserVoiceOption[];
  selectedBrowserVoiceId: string;
  onChange: (voiceId: string) => void;
}

export function VoicePackagePicker({ browserVoices, selectedBrowserVoiceId, onChange }: VoicePackagePickerProps) {
  const { voiceGroups, selectedVoiceValue } = useVoiceGroups(browserVoices, selectedBrowserVoiceId);

  return (
    <div className="reader-liquid-control rounded-[26px] px-5 py-4.5">
      <div className="space-y-3">
        <p
          className="text-[10px] font-bold tracking-[0.18em] uppercase opacity-30"
          style={{ color: "var(--reader-text)" }}
        >
          语音包 · Voice Package
        </p>
        <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto [scrollbar-color:color-mix(in_srgb,var(--reader-text)_22%,transparent)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[color-mix(in_srgb,var(--reader-text)_20%,transparent)]">
          {voiceGroups.flatMap((group) =>
            group.voices.map((option) => (
              <button
                key={option.value}
                type="button"
                disabled={option.disabled}
                onClick={() => {
                  if (!option.disabled) {
                    onChange(option.value);
                  }
                }}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition-all",
                  option.disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-[color-mix(in_srgb,var(--reader-primary)_8%,transparent)]",
                  selectedVoiceValue === option.value &&
                    "reader-liquid-control bg-[color-mix(in_srgb,var(--reader-primary)_12%,transparent)]"
                )}
                style={{ color: "var(--reader-text)" }}
              >
                <span className="truncate">{option.label}</span>
                {selectedVoiceValue === option.value && (
                  <Check className="ml-auto size-4 shrink-0" style={{ color: "var(--reader-primary)" }} />
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
