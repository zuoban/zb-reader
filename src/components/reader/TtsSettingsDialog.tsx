"use client";

import { useState, useRef, useEffect, useMemo } from "react";
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
        className="flex h-11 w-full items-center justify-between rounded-2xl border border-white/18 bg-[linear-gradient(180deg,rgba(255,255,255,0.2),rgba(255,255,255,0.08))] px-4 text-left text-sm font-medium text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.24),inset_0_-1px_0_rgba(255,255,255,0.04)] backdrop-blur-2xl cursor-pointer transition-all duration-200 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.24),rgba(255,255,255,0.1))] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.24),0_18px_34px_-24px_rgba(0,0,0,0.55)]"
      >
        <span className="truncate">{activeLabel}</span>
        <ChevronDown className={cn("size-4 shrink-0 opacity-70 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          className={cn(
            "absolute left-0 right-0 z-[90] max-h-[40vh] overflow-y-auto rounded-2xl border border-white/18 bg-[linear-gradient(180deg,rgba(37,43,56,0.92),rgba(22,27,38,0.9))] shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_26px_40px_-22px_rgba(0,0,0,0.8)] backdrop-blur-3xl [scrollbar-color:rgba(255,255,255,0.26)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20",
            flip ? "bottom-full mb-2" : "top-full mt-2"
          )}
        >
          {groups.map((group) => (
            <div key={group.label} className="px-2 py-1 first:pt-2">
              <div className="px-2 py-1.5 text-[10px] font-semibold tracking-[0.18em] text-white/34">
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
                    "flex w-full items-center justify-between rounded-[16px] px-3 py-2.5 text-sm text-white/90 transition-colors",
                    option.disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-white/10 cursor-pointer",
                    value === option.value &&
                      "border border-white/16 bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0.08))] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
                  )}
                >
                  <span className="truncate">{option.label}</span>
                  {value === option.value && (
                    <span className="ml-2 flex size-5 shrink-0 items-center justify-center rounded-full border border-white/16 bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]">
                      <Check className="size-3 text-white" />
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
        className="fixed inset-0 z-[80] bg-[radial-gradient(circle_at_top,rgba(214,231,255,0.18),transparent_24%),rgba(5,8,14,0.64)] backdrop-blur-md"
        onClick={() => onOpenChange(false)}
      />
      <div
        className={cn(
          "animate-reader-fade-up fixed left-1/2 top-1/2 z-[80] w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[28px] border border-white/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.2),rgba(255,255,255,0.08))] p-5 backdrop-blur-3xl shadow-[inset_0_1px_0_rgba(255,255,255,0.3),inset_0_-1px_0_rgba(255,255,255,0.04),0_28px_60px_-28px_rgba(0,0,0,0.78)] sm:p-6",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "sm:max-w-sm"
        )}
        style={{ transition: "all 150ms cubic-bezier(0.4, 0, 0.2, 1)" }}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(255,255,255,0.16),transparent)]" />

        <div className="relative mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-lg font-semibold text-white/94">
              <Settings className="size-5" />
              朗读设置
            </div>
            <p className="mt-1 text-xs text-white/58">
              调整语音与语速，让沉浸朗读更贴近你的节奏
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex size-8 items-center justify-center rounded-full border border-white/18 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.08))] text-white/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.22),rgba(255,255,255,0.1))] hover:text-white cursor-pointer transition-colors"
            aria-label="关闭"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="relative space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "当前语速", value: `${ttsRate.toFixed(1)}x` },
              { label: "当前语音", value: activeVoiceLabel },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-[20px] border border-white/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(255,255,255,0.06))] px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]"
              >
                <p className="text-[11px] tracking-[0.14em] text-white/52">
                  {item.label}
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-white/92">
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-[22px] border border-white/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(255,255,255,0.06))] px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]">
            <div className="space-y-2.5">
              <p className="text-xs font-medium tracking-[0.12em] text-white/62">语音</p>
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
          </div>

          <div className="rounded-[22px] border border-white/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(255,255,255,0.06))] px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]">
            <div className="space-y-3.5">
              <div className="flex items-center justify-between gap-3 text-xs text-white/62">
                <p className="font-medium tracking-[0.12em]">语速</p>
                <span className="rounded-full border border-white/16 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.08))] px-2.5 py-1 text-[11px] font-semibold text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
                  {ttsRate.toFixed(1)}x
                </span>
              </div>
              <div className="relative flex h-10 items-center">
                <div className="absolute inset-x-0 h-1.5 rounded-full bg-white/14">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,rgba(255,255,255,0.98),rgba(209,228,255,0.78))] shadow-[0_0_12px_rgba(214,232,255,0.28)]"
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
                  className="pointer-events-none absolute h-5 w-5 rounded-full border border-white/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(228,238,255,0.82))] shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_8px_18px_-10px_rgba(176,206,255,0.7)]"
                  style={{ left: `calc(${((ttsRate - 1) / (2 - 1)) * 100}% - 10px)` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="relative mt-5 flex justify-end">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-full border border-white/28 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(228,238,255,0.82))] px-6 py-2.5 text-sm font-semibold text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.86),0_14px_28px_-16px_rgba(184,214,255,0.7)] hover:scale-[1.02] cursor-pointer transition-all active:scale-[0.98]"
          >
            确定
          </button>
        </div>
      </div>
    </>
  );
}
