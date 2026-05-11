"use client";

import { cn } from "@/lib/utils";

const TTS_RATE_OPTIONS = [1, 1.25, 1.5, 1.75, 2];

function formatRateLabel(rate: number) {
  const value = Number.isInteger(rate) ? String(rate) : rate.toFixed(2).replace(/0$/, "");
  return `${value} 倍`;
}

interface RateControlProps {
  ttsRate: number;
  onChange: (value: number) => void;
}

export function RateControl({ ttsRate, onChange }: RateControlProps) {
  return (
    <div className="tts-settings-card rounded-[24px] px-5 py-4.5">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/36">语速控制 · Speed</p>
          <span className="rounded-full bg-white/8 px-2.5 py-1 text-[11px] font-bold tabular-nums text-white/86">
            {formatRateLabel(ttsRate)}
          </span>
        </div>
        <div className="grid grid-cols-5 gap-1.5 rounded-[20px] border border-white/10 bg-slate-950/32 p-1.5">
          {TTS_RATE_OPTIONS.map((rate) => {
            const isActive = Math.abs(ttsRate - rate) < 0.05;
            return (
              <button
                key={rate}
                type="button"
                onClick={() => onChange(rate)}
                className={cn(
                  "inline-flex h-9 min-w-0 cursor-pointer items-center justify-center gap-0.5 rounded-xl px-1 text-[11px] font-bold transition-all duration-200",
                  isActive
                    ? "bg-sky-100 text-slate-950 shadow-[0_12px_28px_-14px_rgba(147,197,253,0.8)]"
                    : "text-white/76 hover:bg-white/8 hover:text-white"
                )}
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
  );
}
