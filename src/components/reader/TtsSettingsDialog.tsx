"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Check, ChevronDown, Settings, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BrowserVoiceOption } from "@/lib/tts";

interface TtsSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ttsRate: number;
  selectedBrowserVoiceId: string;
  browserVoices: BrowserVoiceOption[];
  onTtsRateChange: (value: number) => void;
  onSelectedBrowserVoiceIdChange: (voiceId: string) => void;
}

interface VoiceOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface VoiceGroup {
  label: string;
  voices: VoiceOption[];
}

function VoiceSelect({
  value,
  groups,
  activeLabel,
  onChange,
}: {
  value: string;
  groups: VoiceGroup[];
  activeLabel: string;
  onChange: (value: string) => void;
}) {
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
        className="flex h-11 w-full items-center justify-between rounded-2xl border-0 bg-white/10 px-4 text-left text-sm font-medium text-white cursor-pointer hover:bg-white/14 transition-colors"
      >
        <span className="truncate">{activeLabel}</span>
        <ChevronDown className={cn("size-4 shrink-0 opacity-60 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          className={cn(
            "absolute left-0 right-0 z-[90] max-h-[40vh] overflow-y-auto rounded-xl border border-white/12 bg-[#1a1a1a] shadow-xl backdrop-blur-xl",
            flip ? "bottom-full mb-2" : "top-full mt-2"
          )}
        >
          {groups.map((group) => (
            <div key={group.label}>
              <div className="px-3 py-2 text-xs font-semibold text-white/50">{group.label}</div>
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
                    "flex w-full items-center justify-between px-3 py-2.5 text-sm text-white transition-colors",
                    option.disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-white/10 cursor-pointer",
                    value === option.value && "bg-white/8"
                  )}
                >
                  <span className="truncate">{option.label}</span>
                  {value === option.value && <Check className="size-4 shrink-0 ml-2" />}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function TtsSettingsDialog({
  open,
  onOpenChange,
  ttsRate,
  selectedBrowserVoiceId,
  browserVoices,
  onTtsRateChange,
  onSelectedBrowserVoiceIdChange,
}: TtsSettingsDialogProps) {
  const { activeVoiceLabel, voiceGroups, selectedVoiceValue } = useMemo(() => {
    if (browserVoices.length === 0) {
      return {
        activeVoiceLabel: "默认语音",
        voiceGroups: [{ label: "暂无可用语音", voices: [{ value: "__empty__", label: "暂无可用语音", disabled: true }] }],
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

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div
        className={cn(
          "fixed left-1/2 top-1/2 z-[80] w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-[28px] border border-white/10 bg-white/8 p-6 backdrop-blur-xl shadow-[0_16px_48px_-28px_rgba(0,0,0,0.75)]",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "sm:max-w-sm"
        )}
        style={{ transition: "all 150ms cubic-bezier(0.4, 0, 0.2, 1)" }}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-lg font-semibold text-white">
            <Settings className="size-5" />
            朗读设置
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="size-8 rounded-full border border-white/10 bg-white/5 text-white/70 hover:bg-white/12 hover:text-white cursor-pointer flex items-center justify-center transition-colors"
            aria-label="关闭"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-xs font-medium text-white/62">语音</p>
            <VoiceSelect
              value={selectedVoiceValue}
              groups={voiceGroups}
              activeLabel={activeVoiceLabel}
              onChange={(value) => {
                if (value === "__empty__") return;
                onSelectedBrowserVoiceIdChange(value);
              }}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 text-xs text-white/62">
              <p className="font-medium">语速</p>
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/88">
                {ttsRate.toFixed(1)}x
              </span>
            </div>
            <div className="relative flex h-11 items-center">
              <div className="absolute inset-x-0 h-1.5 rounded-full bg-white/12">
                <div
                  className="h-full rounded-full bg-white"
                  style={{ width: `${((ttsRate - 1) / (2 - 1)) * 100}%` }}
                />
              </div>
              <input
                type="range"
                min={1}
                max={2}
                step={0.1}
                value={ttsRate}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                onChange={(e) => onTtsRateChange(Number(e.target.value))}
              />
              <div
                className="pointer-events-none absolute h-5 w-5 rounded-full border-2 border-white bg-[#171319]"
                style={{ left: `calc(${((ttsRate - 1) / (2 - 1)) * 100}% - 10px)` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black hover:bg-white/92 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            确定
          </button>
        </div>
      </div>
    </>
  );
}