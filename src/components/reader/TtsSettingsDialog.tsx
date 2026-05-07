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

const TTS_RATE_OPTIONS = [1, 1.25, 1.5, 1.75, 2];

function formatRateLabel(rate: number) {
  const value = Number.isInteger(rate) ? String(rate) : rate.toFixed(2).replace(/0$/, "");
  return `${value} 倍`;
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
        className="fixed inset-0 z-[80] bg-black/42 backdrop-blur-md"
        onClick={() => onOpenChange(false)}
      />
      <div
        className={cn(
          "reader-liquid-surface animate-reader-fade-up fixed left-1/2 top-1/2 z-[80] w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[28px] p-5 sm:p-6",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "sm:max-w-sm"
        )}
        style={{ transition: "all 150ms cubic-bezier(0.4, 0, 0.2, 1)" }}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,color-mix(in_srgb,white_18%,transparent),transparent)]" />

        <div className="relative mb-5 flex items-start justify-between gap-4">
          <div>
            <div
              className="flex items-center gap-2 text-lg font-semibold"
              style={{ color: "var(--reader-text)" }}
            >
              <Settings className="size-5" />
              朗读设置
            </div>
            <p className="mt-1 text-xs" style={{ color: "var(--reader-muted-text)" }}>
              调整语音与语速，让沉浸朗读更贴近你的节奏
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="reader-liquid-control flex size-8 cursor-pointer items-center justify-center rounded-full transition-colors"
            style={{ color: "var(--reader-muted-text)" }}
            aria-label="关闭"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="relative space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "当前语速", value: formatRateLabel(ttsRate) },
              { label: "当前语音", value: activeVoiceLabel },
            ].map((item) => (
              <div
                key={item.label}
                className="reader-liquid-control rounded-[20px] px-3.5 py-3"
              >
                <p
                  className="text-[11px] tracking-[0.14em]"
                  style={{ color: "var(--reader-muted-text)" }}
                >
                  {item.label}
                </p>
                <p
                  className="mt-1 truncate text-sm font-semibold"
                  style={{ color: "var(--reader-text)" }}
                >
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          <div className="reader-liquid-control rounded-[22px] px-4 py-3.5">
            <div className="space-y-2.5">
              <p
                className="text-xs font-medium tracking-[0.12em]"
                style={{ color: "var(--reader-muted-text)" }}
              >
                语音
              </p>
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

          <div className="reader-liquid-control rounded-[22px] px-4 py-3.5">
            <div className="space-y-3.5">
              <div
                className="flex items-center justify-between gap-3 text-xs"
                style={{ color: "var(--reader-muted-text)" }}
              >
                <p className="font-medium tracking-[0.12em]">语速</p>
                <span className="text-[11px] font-semibold" style={{ color: "var(--reader-text)" }}>
                  {formatRateLabel(ttsRate)}
                </span>
              </div>
              <div
                className="grid grid-cols-5 gap-1 rounded-2xl border p-1"
                style={{
                  borderColor: "color-mix(in srgb, var(--reader-border) 72%, transparent)",
                  background: "color-mix(in srgb, var(--reader-card-bg) 50%, transparent)",
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
                        "inline-flex h-8 min-w-0 cursor-pointer items-center justify-center gap-0.5 rounded-xl px-1 text-[11px] font-semibold transition-all duration-200",
                        isActive
                          ? "shadow-[0_10px_24px_-18px_color-mix(in_srgb,var(--reader-primary)_72%,transparent)]"
                          : "hover:bg-[color-mix(in_srgb,var(--reader-primary)_8%,transparent)]"
                      )}
                      style={{
                        background: isActive ? "var(--reader-primary)" : "transparent",
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
            </div>
          </div>
        </div>

        <div className="relative mt-5 flex justify-end">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="reader-liquid-control cursor-pointer rounded-full px-6 py-2.5 text-sm font-semibold transition-all hover:-translate-y-0.5 active:scale-[0.98]"
            style={{ color: "var(--reader-text)" }}
          >
            确定
          </button>
        </div>
      </div>
    </>
  );
}
