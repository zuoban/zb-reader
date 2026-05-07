"use client";

import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface VoiceGroup {
  label: string;
  voices: VoiceOption[];
}

interface VoiceSelectorProps {
  value: string;
  groups: VoiceGroup[];
  activeLabel: string;
  onChange: (value: string) => void;
}

export function VoiceSelector({ value, groups, activeLabel, onChange }: VoiceSelectorProps) {
  const [open, setOpen] = useState(false);
  const [flip, setFlip] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

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
        <ChevronDown className={cn("size-4 shrink-0 opacity-60 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          className={cn(
            "reader-liquid-surface absolute left-0 right-0 z-[80] max-h-[40vh] overflow-y-auto rounded-xl p-1 [scrollbar-color:color-mix(in_srgb,var(--reader-text)_22%,transparent)_transparent] [scrollbar-width:thin]",
            flip ? "bottom-full mb-2" : "top-full mt-2"
          )}
        >
          {groups.map((group) => (
            <div key={group.label}>
              <div
                className="px-3 py-2 text-xs font-semibold"
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
                    "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors",
                    option.disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-[color-mix(in_srgb,var(--reader-primary)_8%,transparent)]",
                    value === option.value && "reader-liquid-control"
                  )}
                  style={{ color: "var(--reader-text)" }}
                >
                  <span className="truncate">{option.label}</span>
                  {value === option.value && <Check className="ml-2 size-4 shrink-0" />}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
