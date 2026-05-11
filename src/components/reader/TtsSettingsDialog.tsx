"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BrowserVoiceOption } from "@/lib/tts";
import { RateControl } from "./RateControl";
import { VoicePackagePicker } from "./VoicePackagePicker";

interface TtsSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ttsRate: number;
  selectedTtsVoiceId: string;
  ttsVoices: BrowserVoiceOption[];
  onTtsRateChange: (value: number) => void;
  onSelectedTtsVoiceIdChange: (voiceId: string) => void;
}

function formatRateLabel(rate: number) {
  const value = Number.isInteger(rate) ? String(rate) : rate.toFixed(2).replace(/0$/, "");
  return `${value} 倍`;
}

export function TtsSettingsDialog({
  open,
  onOpenChange,
  ttsRate,
  selectedTtsVoiceId,
  ttsVoices,
  onTtsRateChange,
  onSelectedTtsVoiceIdChange,
}: TtsSettingsDialogProps) {
  const activeVoiceLabel = ttsVoices.find((v) => v.id === selectedTtsVoiceId)?.name ?? "默认语音";

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

          <VoicePackagePicker
            ttsVoices={ttsVoices}
            selectedTtsVoiceId={selectedTtsVoiceId}
            onChange={onSelectedTtsVoiceIdChange}
          />

          <RateControl ttsRate={ttsRate} onChange={onTtsRateChange} />
        </div>

        <div className="relative mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="reader-liquid-control w-full cursor-pointer rounded-full px-8 py-3.5 text-sm font-bold tracking-widest transition-all hover:-translate-y-0.5 active:scale-[0.98]"
            style={{
              background: "var(--reader-primary)",
              color: "var(--reader-bg)",
            }}
          >
            确认并保存
          </button>
        </div>
      </div>
    </>
  );
}
