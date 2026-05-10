"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Check, ChevronDown, X } from "lucide-react";
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
          "reader-liquid-surface animate-reader-fade-up fixed left-1/2 top-1/2 z-[80] w-full max-w-[calc(100%-2.5rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[32px] p-6 sm:p-8",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "sm:max-w-md"
        )}
        style={{ transition: "all 150ms cubic-bezier(0.4, 0, 0.2, 1)" }}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[linear-gradient(180deg,color-mix(in_srgb,white_12%,transparent),transparent)]" />

        <div className="relative mb-8 flex items-start justify-between gap-4">
          <div className="flex flex-col items-center flex-1">
            <div className="w-12 h-1.5 rounded-full bg-[var(--reader-text)]/10 mb-4" />
            <div
              className="flex flex-col items-center gap-1"
              style={{ color: "var(--reader-text)" }}
            >
              <h2 className="font-heading text-2xl font-bold tracking-tight">朗读设置</h2>
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-30">
                Immersive Voice Settings
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="reader-liquid-control absolute right-0 top-6 flex size-9 cursor-pointer items-center justify-center rounded-full transition-all hover:scale-105 active:scale-95"
            style={{ color: "var(--reader-text)" }}
            aria-label="关闭"
          >
            <X className="size-4.5" />
          </button>
        </div>

        <div className="relative space-y-6">
          <div className="grid grid-cols-2 gap-3.5">
            {[
              { label: "当前语速 · RATE", value: formatRateLabel(ttsRate) },
              { label: "当前语音 · VOICE", value: activeVoiceLabel },
            ].map((item) => (
              <div
                key={item.label}
                className="reader-liquid-control rounded-[22px] px-4 py-3.5"
              >
                <p
                  className="text-[9px] font-bold tracking-[0.18em] uppercase opacity-30"
                  style={{ color: "var(--reader-text)" }}
                >
                  {item.label}
                </p>
                <p
                  className="mt-1.5 truncate text-[13px] font-bold"
                  style={{ color: "var(--reader-text)" }}
                >
                  {item.value}
                </p>
              </div>
            ))}
          </div>

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
                  onSelectedBrowserVoiceIdChange(value);
                }}
              />
            </div>
          </div>

          <div className="reader-liquid-control rounded-[26px] px-5 py-4.5">
            <div className="space-y-4">
              <div
                className="flex items-center justify-between gap-3"
                style={{ color: "var(--reader-text)" }}
              >
                <p className="text-[10px] font-bold tracking-[0.18em] uppercase opacity-30">语速控制 · Speed</p>
                <span className="text-[11px] font-bold tabular-nums px-2.5 py-1 rounded-full bg-[var(--reader-text)]/5">
                  {formatRateLabel(ttsRate)}
                </span>
              </div>
              <div
                className="grid grid-cols-5 gap-1.5 rounded-[20px] border p-1.5"
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
                        "inline-flex h-9 min-w-0 cursor-pointer items-center justify-center gap-0.5 rounded-xl px-1 text-[11px] font-bold transition-all duration-300",
                        isActive
                          ? "shadow-[0_12px_28px_-14px_color-mix(in_srgb,var(--reader-primary)_88%,transparent)]"
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
                      <span className="text-[9px] ml-0.5">X</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="relative mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="reader-liquid-control w-full cursor-pointer rounded-full px-8 py-3.5 text-sm font-bold tracking-widest transition-all hover:-translate-y-0.5 active:scale-[0.98]"
            style={{ 
              background: "var(--reader-primary)",
              color: "var(--reader-bg)"
            }}
          >
            确认并保存
          </button>
        </div>
      </div>
    </>
  );
}
