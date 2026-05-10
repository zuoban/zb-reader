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
                onClick={() => onChange(rate)}
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
  );
}
