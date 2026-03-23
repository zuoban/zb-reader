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
  const containerRef = useRef<HTMLDivElement>(null);

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

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-11 w-full items-center justify-between rounded-2xl border-0 bg-white/10 px-4 text-left text-sm font-medium text-white cursor-pointer hover:bg-white/14 transition-colors"
      >
        <span className="truncate">{activeLabel}</span>
        <ChevronDown className={cn("size-4 shrink-0 opacity-60 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-[80] mt-2 max-h-[320px] overflow-y-auto rounded-xl border border-white/12 bg-[#1a1a1a] shadow-xl backdrop-blur-xl">
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
