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
        className="fixed inset-0 z-[80] bg-slate-950/54 backdrop-blur-md"
        onClick={() => onOpenChange(false)}
      />
      <div
        className={cn(
          "tts-settings-dialog animate-reader-fade-up fixed left-1/2 top-1/2 z-[80] w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[28px] p-5 sm:rounded-[32px] sm:p-7",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "sm:max-w-md"
        )}
        style={{ transition: "all 150ms cubic-bezier(0.4, 0, 0.2, 1)" }}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[linear-gradient(180deg,rgba(191,219,254,0.12),transparent)]" />

        <div className="relative mb-6 flex items-start justify-between gap-4 sm:mb-7">
          <div className="flex flex-1 flex-col items-center">
            <div className="mb-4 h-1.5 w-12 rounded-full bg-white/14" />
            <div
              className="flex flex-col items-center gap-1"
              style={{ color: "var(--reader-text)" }}
            >
              <h2 className="font-heading text-2xl font-bold tracking-tight text-white/94">朗读设置</h2>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/34">
                Immersive Voice Settings
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="tts-settings-icon-button absolute right-0 top-5 flex size-10 cursor-pointer items-center justify-center rounded-full transition-all hover:scale-105 active:scale-95"
            aria-label="关闭"
          >
            <X className="size-4.5 text-white/86" />
          </button>
        </div>

        <div className="relative space-y-4.5 sm:space-y-5">
          <div className="grid grid-cols-2 gap-3.5">
            {[
              { label: "当前语速 · RATE", value: formatRateLabel(ttsRate) },
              { label: "当前语音 · VOICE", value: activeVoiceLabel },
            ].map((item) => (
              <div
                key={item.label}
                className="tts-settings-card rounded-[20px] px-4 py-3.5"
              >
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/36">
                  {item.label}
                </p>
                <p className="mt-1.5 truncate text-[13px] font-bold text-white/92">
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
      </div>
    </>
  );
}
