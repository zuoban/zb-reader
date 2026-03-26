"use client";

import { Check, Minus, Plus, Volume2, Type, Palette, ChevronDown, BookOpen } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BrowserVoiceOption } from "@/lib/tts";
import { cn } from "@/lib/utils";

interface ReadingSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  pageWidth: number;
  onPageWidthChange: (width: number) => void;
  theme: "light" | "dark" | "sepia";
  onThemeChange: (theme: "light" | "dark" | "sepia") => void;
  browserVoices: BrowserVoiceOption[];
  selectedBrowserVoiceId: string;
  onSelectedBrowserVoiceIdChange: (voiceId: string) => void;
  ttsRate: number;
  onTtsRateChange: (value: number) => void;
  microsoftPreloadCount: number;
  onMicrosoftPreloadCountChange: (value: number) => void;
  ttsAutoNextChapter: boolean;
  onTtsAutoNextChapterChange: (value: boolean) => void;
  ttsHighlightColor: string;
  onTtsHighlightColorChange: (color: string) => void;
  ttsHighlightStyle: "background" | "indicator";
  onTtsHighlightStyleChange: (style: "background" | "indicator") => void;
  flipMode: "scroll" | "page";
  onFlipModeChange: (mode: "scroll" | "page") => void;
}

const themeOptions = [
  { value: "light" as const, label: "白色", bg: "#ffffff", textColor: "#334155", borderColor: "#e2e8f0" },
  { value: "dark" as const, label: "深色", bg: "#1e293b", textColor: "#e2e8f0", borderColor: "#334155" },
  { value: "sepia" as const, label: "护眼", bg: "#f4ecd8", textColor: "#5c4a32", borderColor: "#d6c9a8" },
];

function SettingCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn("rounded-2xl sm:rounded-3xl overflow-hidden", className)}
      style={{
        background: "var(--reader-card-bg)",
        border: "1px solid var(--reader-border)",
      }}
    >
      {children}
    </div>
  );
}

function SettingRow({
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
        "flex items-center justify-between gap-3 sm:gap-4 px-3.5 sm:px-4 py-3 sm:py-3.5",
        !noBorder && "border-b"
      )}
      style={{ borderColor: "var(--reader-border)" }}
    >
      <div className="min-w-0 flex-shrink-0">
        <span
          className="text-[13px] sm:text-[14px] font-medium block"
          style={{ color: "var(--reader-text)" }}
        >
          {label}
        </span>
        {sublabel && (
          <span
            className="text-[11px] sm:text-[12px] block mt-0.5"
            style={{ color: "var(--reader-text)", opacity: 0.5 }}
          >
            {sublabel}
          </span>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function SectionLabel({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-2.5 px-0.5 sm:px-1">
      <Icon
        className="size-3 sm:size-3.5"
        style={{ color: "var(--reader-text)", opacity: 0.45 }}
      />
      <span
        className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider sm:tracking-widest"
        style={{ color: "var(--reader-text)", opacity: 0.45 }}
      >
        {title}
      </span>
    </div>
  );
}

function SliderRow({
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
        "px-3.5 sm:px-4 py-3.5 sm:py-4 space-y-3 sm:space-y-3.5",
        !noBorder && "border-b"
      )}
      style={{ borderColor: "var(--reader-border)" }}
    >
      <div className="flex items-center justify-between">
        <span
          className="text-[13px] sm:text-[14px] font-medium"
          style={{ color: "var(--reader-text)" }}
        >
          {label}
        </span>
        <span
          className="text-[11px] sm:text-[12px] font-bold tabular-nums min-w-[48px] sm:min-w-[52px] text-center px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl"
          style={{
            background: "color-mix(in srgb, var(--reader-primary) 15%, transparent)",
            color: "var(--reader-primary)",
          }}
        >
          {showValue}{unit}
        </span>
      </div>
      <div className="relative h-6 sm:h-7 flex items-center">
        <div
          className="absolute inset-x-0 h-1.5 sm:h-2 rounded-full"
          style={{ background: "color-mix(in srgb, var(--reader-text) 15%, transparent)" }}
        >
          <div
            className="h-full rounded-full"
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
          className="absolute w-5 sm:w-5.5 h-5 sm:h-5.5 rounded-full pointer-events-none transition-transform duration-150"
          style={{
            left: `calc(${percentage}% - 10px)`,
            background: "var(--reader-card-bg)",
            border: "2.5px solid var(--reader-primary)",
          }}
        />
      </div>
    </div>
  );
}

function CompactSelect({
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
        className="h-8 sm:h-9 text-[12px] sm:text-[13px] font-medium border-0 rounded-lg sm:rounded-xl cursor-pointer focus:ring-0 focus:ring-offset-0 gap-1 sm:gap-1.5 pr-2 sm:pr-2.5 pl-2.5 sm:pl-3"
        style={{
          background: "color-mix(in srgb, var(--reader-text) 15%, transparent)",
          color: "var(--reader-text)",
          minWidth: "120px",
          maxWidth: "200px",
        }}
      >
        <SelectValue placeholder={placeholder} />
        <ChevronDown className="size-3 sm:size-3.5 shrink-0 opacity-50" />
      </SelectTrigger>
      <SelectContent className="rounded-lg sm:rounded-xl">
        {options.map((opt) => (
          <SelectItem
            key={opt.value}
            value={opt.value}
            disabled={opt.disabled}
            className="rounded-md sm:rounded-lg text-[12px] sm:text-[13px]"
          >
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ReadingSettings({
  open,
  onOpenChange,
  fontSize,
  onFontSizeChange,
  pageWidth,
  onPageWidthChange,
  theme,
  onThemeChange,
  browserVoices,
  selectedBrowserVoiceId,
  onSelectedBrowserVoiceIdChange,
  ttsRate,
  onTtsRateChange,
  microsoftPreloadCount,
  onMicrosoftPreloadCountChange,
  ttsAutoNextChapter,
  onTtsAutoNextChapterChange,
  ttsHighlightColor,
  onTtsHighlightColorChange,
  ttsHighlightStyle,
  onTtsHighlightStyleChange,
  flipMode,
  onFlipModeChange,
}: ReadingSettingsProps) {
  const themeBg = theme === "light" ? "#ffffff" : theme === "dark" ? "#1e293b" : "#f4ecd8";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showBackground={false}
        className="rounded-t-3xl sm:rounded-t-4xl border-t-0 px-0 sm:max-w-md sm:mx-auto overflow-hidden"
        style={{
          backgroundColor: themeBg,
          borderColor: "var(--reader-border)",
          boxShadow: "0 -20px 60px -8px rgba(0,0,0,0.22), 0 -4px 12px -4px rgba(0,0,0,0.15)",
        }}
      >
        {/* Handle + Title */}
        <SheetHeader className="px-4 sm:px-5 pt-4 sm:pt-4.5 pb-3 sm:pb-4">
          <div className="flex flex-col items-center gap-3 sm:gap-3.5">
            <div
              className="w-10 h-1.5 rounded-full"
              style={{ background: "var(--reader-text)", opacity: 0.15 }}
            />
            <SheetTitle
              className="text-[15px] sm:text-[16px] font-semibold tracking-wide"
              style={{ color: "var(--reader-text)" }}
            >
              阅读设置
            </SheetTitle>
          </div>
        </SheetHeader>

        <div className="px-4 sm:px-5 pb-8 sm:pb-10 max-h-[70vh] sm:max-h-[72vh] overflow-y-auto space-y-5 sm:space-y-6 scrollbar-hide">

           {/* ── 翻页模式 ── */}
           <section>
             <SectionLabel icon={BookOpen} title="翻页模式" />
             <SettingCard>
               <div className="flex gap-1.5 p-4">
                 {[
                   { value: "scroll" as const, label: "滚动模式", description: "连续滚动" },
                   { value: "page" as const, label: "翻页模式", description: "分页翻页" },
                 ].map((option) => {
                   const isActive = flipMode === option.value;
                   return (
                     <button
                       key={option.value}
                       onClick={() => onFlipModeChange(option.value)}
                       className={cn(
                         "flex-1 flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all cursor-pointer",
                         isActive
                           ? "shadow-sm"
                           : "opacity-60 hover:opacity-80"
                       )}
                       style={{
                         background: isActive ? "var(--reader-card-bg)" : "transparent",
                         color: "var(--reader-text)",
                         border: isActive ? "1px solid var(--reader-primary)" : "1px solid transparent",
                       }}
                     >
                       <span className="text-[13px] font-medium">{option.label}</span>
                       <span className="text-[10px] opacity-60">{option.description}</span>
                     </button>
                   );
                 })}
               </div>
             </SettingCard>
           </section>

          {/* ── 排版 ── */}
          <section>
            <SectionLabel icon={Type} title="排版" />
             <SettingCard>
                {/* Font size row */}
                <div
                  className="flex items-center justify-between px-3.5 sm:px-4 py-3.5 sm:py-4 border-b"
                  style={{ borderColor: "var(--reader-border)" }}
                >
                  <span
                    className="text-[13px] sm:text-[14px] font-medium"
                    style={{ color: "var(--reader-text)" }}
                  >
                    字体大小
                  </span>
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <button
                      onClick={() => fontSize > 12 && onFontSizeChange(fontSize - 1)}
                      disabled={fontSize <= 12}
                      className={cn(
                        "w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 cursor-pointer",
                        fontSize <= 12 ? "opacity-25 cursor-not-allowed" : "hover:scale-105 active:opacity-80"
                      )}
                      style={{
                        background: "color-mix(in srgb, var(--reader-text) 12%, transparent)",
                      }}
                    >
                      <Minus
                        className="size-3.5 sm:size-4"
                        style={{ color: "var(--reader-text)" }}
                      />
                    </button>

                    <span
                      className="text-[15px] sm:text-[16px] font-bold tabular-nums w-9 sm:w-10 text-center"
                      style={{ color: "var(--primary)" }}
                    >
                      {fontSize}
                    </span>

                    <button
                      onClick={() => fontSize < 28 && onFontSizeChange(fontSize + 1)}
                      disabled={fontSize >= 28}
                      className={cn(
                        "w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 cursor-pointer",
                        fontSize >= 28 ? "opacity-25 cursor-not-allowed" : "hover:scale-105 active:opacity-80"
                      )}
                      style={{
                        background: "color-mix(in srgb, var(--reader-text) 12%, transparent)",
                      }}
                    >
                      <Plus
                        className="size-3.5 sm:size-4"
                        style={{ color: "var(--reader-text)" }}
                      />
                    </button>
                  </div>
                </div>

                {/* Font size preview strip */}
                <div className="flex items-end justify-between px-5 sm:px-6 py-3 sm:py-3.5 border-b" style={{ borderColor: "var(--reader-border)" }}>
                  {[12, 16, 20, 24, 28].map((s) => {
                    const isActive = fontSize === s;
                    return (
                      <button
                        key={s}
                        onClick={() => onFontSizeChange(s)}
                        className="flex flex-col items-center gap-1.5 sm:gap-2 cursor-pointer transition-transform active:scale-90 group"
                      >
                        <span
                          style={{
                            fontSize: s * 0.65,
                            color: isActive ? "var(--primary)" : "var(--reader-text)",
                            opacity: isActive ? 1 : 0.35,
                            fontWeight: isActive ? 700 : 500,
                            lineHeight: 1,
                            transition: "all 0.2s ease",
                          }}
                        >
                          文
                        </span>
                        <div
                          className="w-1.5 h-1.5 rounded-full transition-all duration-200"
                          style={{
                            background: isActive ? "var(--primary)" : "var(--reader-text)",
                            opacity: isActive ? 1 : 0.2,
                            transform: isActive ? "scale(1.3)" : "scale(1)",
                          }}
                        />
                      </button>
                    );
                  })}
                </div>

               {/* Page width slider */}
               <SliderRow
                 label="页面宽度"
                 value={pageWidth}
                 min={600}
                 max={1200}
                 step={50}
                 onChange={onPageWidthChange}
                 noBorder
               />
             </SettingCard>
           </section>

          {/* ── 主题 ── */}
          <section>
            <SectionLabel icon={Palette} title="主题" />
            <div className="flex gap-3 sm:gap-3.5">
              {themeOptions.map((option) => {
                const isActive = theme === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => onThemeChange(option.value)}
                    className="flex-1 flex flex-col items-center gap-2.5 sm:gap-3 pt-4 sm:pt-5 pb-3 sm:pb-3.5 rounded-2xl sm:rounded-3xl transition-colors duration-150 cursor-pointer relative"
                    style={{
                      background: option.bg,
                      border: isActive
                        ? "2.5px solid var(--primary)"
                        : `2px solid ${option.borderColor}`,
                      opacity: isActive ? 1 : 0.85,
                    }}
                  >
                    {/* Active checkmark */}
                    {isActive && (
                      <div
                        className="absolute top-2 sm:top-2.5 right-2 sm:right-2.5 w-5 sm:w-5.5 h-5 sm:h-5.5 rounded-full flex items-center justify-center"
                        style={{ background: "var(--primary)" }}
                      >
                        <Check className="size-2.5 sm:size-3 text-white" strokeWidth={3.5} />
                      </div>
                    )}

                    {/* Preview lines */}
                    <div className="flex flex-col gap-1.5 sm:gap-2 w-9 sm:w-10 px-0.5">
                      <div className="h-1.5 sm:h-2 rounded-full" style={{ background: option.textColor, opacity: 0.65 }} />
                      <div className="h-1.5 sm:h-2 rounded-full w-3/4" style={{ background: option.textColor, opacity: 0.4 }} />
                      <div className="h-1.5 sm:h-2 rounded-full" style={{ background: option.textColor, opacity: 0.5 }} />
                      <div className="h-1.5 sm:h-2 rounded-full w-5/6" style={{ background: option.textColor, opacity: 0.35 }} />
                    </div>

                    <span
                      className="text-[12px] sm:text-[13px] font-semibold"
                      style={{ color: option.textColor }}
                    >
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── 朗读 ── */}
          <section>
            <SectionLabel icon={Volume2} title="朗读" />
            <SettingCard>
              <SettingRow label="语音包">
                <CompactSelect
                  value={selectedBrowserVoiceId}
                  onChange={onSelectedBrowserVoiceIdChange}
                  placeholder="选择语音"
                  options={
                    browserVoices.length === 0
                      ? [{ value: "__none", label: "未检测到语音", disabled: true }]
                      : browserVoices.map((v) => ({ value: v.id, label: v.name }))
                  }
                />
              </SettingRow>

              <SliderRow
                label="语速"
                value={ttsRate}
                min={1}
                max={2}
                step={0.1}
                onChange={onTtsRateChange}
                unit="x"
              />
              <SettingRow label="预加载段数" noBorder>
                <CompactSelect
                  value={String(microsoftPreloadCount)}
                  onChange={(v) => onMicrosoftPreloadCountChange(Number(v))}
                  options={[
                    { value: "1", label: "1 段" },
                    { value: "2", label: "2 段" },
                    { value: "3", label: "3 段" },
                    { value: "5", label: "5 段" },
                    { value: "8", label: "8 段" },
                  ]}
                />
              </SettingRow>

              <SettingRow label="自动续章" sublabel="当前章节朗读完后自动进入下一章" noBorder>
                <button
                  onClick={() => onTtsAutoNextChapterChange(!ttsAutoNextChapter)}
                  className={cn(
                    "relative w-12 sm:w-13 h-7 sm:h-7.5 rounded-full transition-colors cursor-pointer"
                  )}
                  style={{
                    background: ttsAutoNextChapter
                      ? "var(--reader-primary)"
                      : "color-mix(in srgb, var(--reader-text) 18%, transparent)",
                  }}
                >
                  <span
                    className={cn(
                      "absolute top-1 sm:top-1 left-1 sm:left-1 w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-full transition-transform duration-200 shadow-md",
                      ttsAutoNextChapter ? "translate-x-5.5 sm:translate-x-6" : "translate-x-0"
                    )}
                    style={{ background: "var(--reader-card-bg)" }}
                  />
                </button>
              </SettingRow>

              <SettingRow label="高亮样式" noBorder>
                <div className="flex gap-1.5 p-0.5 rounded-lg" style={{ background: "color-mix(in srgb, var(--reader-text) 8%, transparent)" }}>
                  {[
                    { value: "indicator" as const, label: "指示条" },
                    { value: "background" as const, label: "背景" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => onTtsHighlightStyleChange(option.value)}
                      className={cn(
                        "px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer",
                        ttsHighlightStyle === option.value
                          ? "shadow-sm"
                          : "opacity-60 hover:opacity-80"
                      )}
                      style={{
                        background: ttsHighlightStyle === option.value ? "var(--reader-card-bg)" : "transparent",
                        color: "var(--reader-text)",
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </SettingRow>

              <SettingRow label="高亮颜色" noBorder>
                <div className="flex gap-2 sm:gap-2.5">
                  {["#3b82f6", "#ef4444", "#22c55e", "#eab308", "#a855f7", "#ec4899"].map((color) => {
                    const isActive = ttsHighlightColor === color;
                    return (
                      <button
                        key={color}
                        onClick={() => onTtsHighlightColorChange(color)}
                        className={cn(
                          "w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl transition-all cursor-pointer",
                          isActive ? "scale-115" : "hover:scale-110"
                        )}
                        style={{
                          backgroundColor: color,
                          ...(isActive && {
                            boxShadow: `0 0 0 2.5px var(--reader-card-bg), 0 0 0 5px ${color}`,
                          }),
                        }}
                      />
                    );
                  })}
                  <input
                    type="color"
                    value={ttsHighlightColor}
                    onChange={(e) => onTtsHighlightColorChange(e.target.value)}
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl cursor-pointer border-0 p-0"
                    style={{ background: "transparent" }}
                  />
                </div>
              </SettingRow>
            </SettingCard>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
