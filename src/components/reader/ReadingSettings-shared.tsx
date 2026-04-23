import { Check, ChevronDown, Minus, Plus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const themeOptions = [
  { value: "light" as const, label: "白色", bg: "#ffffff", textColor: "#334155", borderColor: "#e2e8f0" },
  { value: "dark" as const, label: "深色", bg: "#1e293b", textColor: "#e2e8f0", borderColor: "#334155" },
  { value: "sepia" as const, label: "护眼", bg: "#f4ecd8", textColor: "#5c4a32", borderColor: "#d6c9a8" },
];

export const fontOptions = [
  { value: "system", label: "系统默认" },
  { value: "serif", label: "宋体/衬线体" },
  { value: "sans", label: "黑体/无衬线" },
  { value: "kaiti", label: "楷体" },
];

export function SettingCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn("rounded-2xl shadow-sm", className)}
      style={{ background: "var(--reader-card-bg)", border: "1px solid var(--reader-border)" }}
    >
      {children}
    </div>
  );
}

export function SettingRow({
  label,
  sublabel,
  children,
  noBorder,
}: {
  label: string;
  sublabel?: string;
  children: React.ReactNode;
  noBorder?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 sm:py-4",
        !noBorder && "border-b"
      )}
      style={{ borderColor: "var(--reader-border)" }}
    >
      <div className="min-w-0 flex-shrink-0">
        <span
          className="text-[14px] sm:text-[15px] font-semibold block tracking-tight"
          style={{ color: "var(--reader-text)" }}
        >
          {label}
        </span>
        {sublabel && (
          <span
            className="text-[12px] sm:text-[13px] block mt-1"
            style={{ color: "var(--reader-muted-text)" }}
          >
            {sublabel}
          </span>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

export function CompactSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  placeholder?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        className="h-9 sm:h-10 text-[13px] sm:text-[14px] font-medium border-0 rounded-xl cursor-pointer focus:ring-0 focus:ring-offset-0 gap-2 pr-2.5 sm:pr-3 pl-3 sm:pl-3.5 shadow-sm"
        style={{
          background: "var(--reader-card-bg)",
          color: "var(--reader-text)",
          border: "1px solid var(--reader-border)",
          minWidth: "130px",
          maxWidth: "220px",
        }}
      >
        <SelectValue placeholder={placeholder} />
        <ChevronDown className="size-3.5 sm:size-4 shrink-0 opacity-50" />
      </SelectTrigger>
      <SelectContent className="rounded-xl border-border/50 shadow-lg">
        {options.map((opt) => (
          <SelectItem
            key={opt.value}
            value={opt.value}
            disabled={opt.disabled}
            className="rounded-lg text-[13px] sm:text-[14px] cursor-pointer"
          >
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ThemePreviewButton({
  option,
  isActive,
  onClick,
}: {
  option: (typeof themeOptions)[number];
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 flex flex-col items-center gap-2.5 py-4 rounded-2xl transition-all duration-200 cursor-pointer relative"
      style={{
        background: option.bg,
        border: isActive ? "2px solid var(--reader-primary)" : `1px solid ${option.borderColor}`,
        boxShadow: isActive ? "0 4px 12px rgba(0,0,0,0.1)" : "none",
      }}
    >
      {isActive && (
        <div
          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center shadow-sm"
          style={{ background: "var(--reader-primary)" }}
        >
          <Check className="size-3 text-white" strokeWidth={3} />
        </div>
      )}

      <div className="flex flex-col gap-1 w-9 px-0.5">
        <div className="h-1.5 rounded-full" style={{ background: option.textColor, opacity: 0.5 }} />
        <div className="h-1.5 rounded-full w-3/4" style={{ background: option.textColor, opacity: 0.3 }} />
        <div className="h-1.5 rounded-full" style={{ background: option.textColor, opacity: 0.4 }} />
      </div>

      <span className="text-[13px] font-semibold" style={{ color: option.textColor }}>
        {option.label}
      </span>
    </button>
  );
}

export function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
  displayValue,
  unit = "",
  noBorder,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  displayValue?: number | string;
  unit?: string;
  noBorder?: boolean;
}) {
  const percentage = ((value - min) / (max - min)) * 100;
  const showValue = displayValue ?? (Number.isInteger(value) ? value : value.toFixed(1));

  return (
    <div
      className={cn(
        "px-4 sm:px-5 py-4 sm:py-5 space-y-4",
        !noBorder && "border-b"
      )}
      style={{ borderColor: "var(--reader-border)" }}
    >
      <div className="flex items-center justify-between">
        <span
          className="text-[14px] sm:text-[15px] font-semibold tracking-tight"
          style={{ color: "var(--reader-text)" }}
        >
          {label}
        </span>
        <span
          className="text-[12px] sm:text-[13px] font-bold tabular-nums min-w-[52px] sm:min-w-[56px] text-center px-3 py-1.5 rounded-full"
          style={{
            background: "color-mix(in srgb, var(--reader-primary) 12%, transparent)",
            color: "var(--reader-primary)",
          }}
        >
          {showValue}{unit}
        </span>
      </div>
      <div className="relative h-7 flex items-center">
        <div
          className="absolute inset-x-0 h-2 rounded-full"
          style={{ background: "color-mix(in srgb, var(--reader-text) 10%, transparent)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-150"
            style={{ width: `${percentage}%`, background: "var(--reader-primary)" }}
          />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <div
          className="absolute w-5 h-5 rounded-full pointer-events-none transition-all duration-150 shadow-sm"
          style={{
            left: `calc(${percentage}% - 10px)`,
            background: "var(--reader-card-bg)",
            border: "2px solid var(--reader-primary)",
          }}
        />
      </div>
    </div>
  );
}
