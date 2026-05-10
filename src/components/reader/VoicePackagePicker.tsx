"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Check, ChevronDown } from "lucide-react";
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

interface VoiceSelectProps {
  value: string;
  groups: VoiceGroup[];
  activeLabel: string;
  onChange: (value: string) => void;
}

function VoiceSelect({ value, groups, activeLabel, onChange }: VoiceSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [flip, setFlip] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  useEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    setFlip(spaceBelow < 200);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        className="reader-liquid-control flex h-11 w-full cursor-pointer items-center justify-between rounded-2xl px-4 text-left text-sm font-medium transition-all duration-200 hover:-translate-y-0.5"
        style={{ color: "var(--reader-text)" }}
      >
        <span className="truncate">{activeLabel}</span>
        <ChevronDown className={cn("size-4 shrink-0 opacity-70 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          className={cn(
            "reader-liquid-surface absolute left-0 right-0 z-[90] max-h-[40vh] overflow-y-auto rounded-2xl p-1 [scrollbar-color:color-mix(in_srgb,var(--reader-text)_22%,transparent)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[color-mix(in_srgb,var(--reader-text)_20%,transparent)]",
            flip ? "bottom-full mb-2" : "top-full mt-2"
          )}
        >
          {groups.map((group) => (
            <div key={group.label} className="px-2 py-1 first:pt-2">
              <div
                className="px-2 py-1.5 text-[10px] font-semibold tracking-[0.18em]"
                style={{ color: "var(--reader-muted-text)" }}
              >
                {group.label}
              </div>
              {group.voices.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  disabled={option.disabled}
                  onClick={() => {
                    if (!option.disabled) {
                      onChange(option.value);
                      setOpen(false);
                    }
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-[16px] px-3 py-2.5 text-sm transition-colors",
                    option.disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-[color-mix(in_srgb,var(--reader-primary)_8%,transparent)]",
                    value === option.value &&
                      "reader-liquid-control"
                  )}
                  style={{ color: "var(--reader-text)" }}
                >
                  <span className="truncate">{option.label}</span>
                  {value === option.value && (
                    <span
                      className="ml-2 flex size-5 shrink-0 items-center justify-center rounded-full"
                      style={{ background: "var(--reader-primary)" }}
                    >
                      <Check className="size-3" style={{ color: "var(--reader-bg)" }} />
                    </span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
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
  const { activeVoiceLabel, voiceGroups, selectedVoiceValue } = useVoiceGroups(browserVoices, selectedBrowserVoiceId);

  return (
    <div className="reader-liquid-control rounded-[26px] px-5 py-4.5">
      <div className="space-y-3">
        <p
          className="text-[10px] font-bold tracking-[0.18em] uppercase opacity-30"
          style={{ color: "var(--reader-text)" }}
        >
          语音包 · Voice Package
        </p>
        <VoiceSelect
          value={selectedVoiceValue}
          groups={voiceGroups}
          activeLabel={activeVoiceLabel}
          onChange={(value) => {
            if (value === "__empty__") return;
            onChange(value);
          }}
        />
      </div>
    </div>
  );
}
