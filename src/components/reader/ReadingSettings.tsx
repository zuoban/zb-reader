"use client";

import { Check, Minus, Plus, Volume2, Type, Palette, ChevronDown } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { BrowserVoiceOption, TtsConfigApiItem } from "@/lib/tts";
import { cn } from "@/lib/utils";

interface ReadingSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  theme: "light" | "dark" | "sepia";
  onThemeChange: (theme: "light" | "dark" | "sepia") => void;
  ttsEngine: "browser" | "legado";
  onTtsEngineChange: (engine: "browser" | "legado") => void;
  browserVoices: BrowserVoiceOption[];
  selectedBrowserVoiceId: string;
  onSelectedBrowserVoiceIdChange: (voiceId: string) => void;
  ttsRate: number;
  onTtsRateChange: (value: number) => void;
  ttsPitch: number;
  onTtsPitchChange: (value: number) => void;
  ttsVolume: number;
  onTtsVolumeChange: (value: number) => void;
  microsoftPreloadCount: number;
  onMicrosoftPreloadCountChange: (value: number) => void;
  legadoRate: number;
  onLegadoRateChange: (value: number) => void;
  legadoConfigs: TtsConfigApiItem[];
  selectedLegadoConfigId: string;
  onSelectedLegadoConfigIdChange: (configId: string) => void;
  legadoImportText: string;
  onLegadoImportTextChange: (text: string) => void;
  onLegadoImport: () => void;
  legadoImporting: boolean;
  legadoPreloadCount: number;
  onLegadoPreloadCountChange: (value: number) => void;
}

const themeOptions = [
  { value: "light" as const, label: "白色", bg: "#ffffff", textColor: "#334155", borderColor: "#e2e8f0" },
  { value: "dark" as const, label: "深色", bg: "#1e293b", textColor: "#e2e8f0", borderColor: "#334155" },
  { value: "sepia" as const, label: "护眼", bg: "#f4ecd8", textColor: "#5c4a32", borderColor: "#d6c9a8" },
];

function SettingCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn("rounded-2xl overflow-hidden", className)}
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
        "flex items-center justify-between gap-4 px-4 py-3.5",
        !noBorder && "border-b"
      )}
      style={{ borderColor: "var(--reader-border)" }}
    >
      <div className="min-w-0 flex-shrink-0">
        <span
          className="text-[14px] font-medium block"
          style={{ color: "var(--reader-text)" }}
        >
          {label}
        </span>
        {sublabel && (
          <span
            className="text-[12px] block mt-0.5"
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
    <div className="flex items-center gap-2 mb-2.5 px-1">
      <Icon
        className="size-3.5"
        style={{ color: "var(--reader-text)", opacity: 0.45 }}
      />
      <span
        className="text-[11px] font-semibold uppercase tracking-widest"
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
        "px-4 py-3.5 space-y-3",
        !noBorder && "border-b"
      )}
      style={{ borderColor: "var(--reader-border)" }}
    >
      <div className="flex items-center justify-between">
        <span
          className="text-[14px] font-medium"
          style={{ color: "var(--reader-text)" }}
        >
          {label}
        </span>
        <span
          className="text-[12px] font-semibold tabular-nums min-w-[48px] text-center px-2.5 py-1 rounded-lg"
          style={{
            background: "color-mix(in srgb, var(--primary) 12%, transparent)",
            color: "var(--primary)",
          }}
        >
          {showValue}{unit}
        </span>
      </div>
      <div className="relative h-6 flex items-center">
        <div
          className="absolute inset-x-0 h-[3px] rounded-full"
          style={{ background: "color-mix(in srgb, var(--reader-text) 12%, transparent)" }}
        >
          <div
            className="h-full rounded-full"
            style={{ width: `${percentage}%`, background: "var(--primary)" }}
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
          className="absolute w-5 h-5 rounded-full pointer-events-none transition-shadow"
          style={{
            left: `calc(${percentage}% - 10px)`,
            background: "var(--reader-card-bg)",
            border: "2px solid var(--primary)",
            boxShadow: "0 1px 6px color-mix(in srgb, var(--primary) 35%, transparent)",
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
        className="h-9 text-[13px] font-medium border-0 rounded-xl cursor-pointer focus:ring-0 focus:ring-offset-0 gap-1.5 pr-2.5 pl-3"
        style={{
          background: "color-mix(in srgb, var(--reader-text) 8%, transparent)",
          color: "var(--reader-text)",
          minWidth: "140px",
          maxWidth: "200px",
        }}
      >
        <SelectValue placeholder={placeholder} />
        <ChevronDown className="size-3.5 shrink-0 opacity-50" />
      </SelectTrigger>
      <SelectContent className="rounded-xl">
        {options.map((opt) => (
          <SelectItem
            key={opt.value}
            value={opt.value}
            disabled={opt.disabled}
            className="rounded-lg text-[13px]"
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
  theme,
  onThemeChange,
  ttsEngine,
  onTtsEngineChange,
  browserVoices,
  selectedBrowserVoiceId,
  onSelectedBrowserVoiceIdChange,
  ttsRate,
  onTtsRateChange,
  ttsPitch,
  onTtsPitchChange,
  ttsVolume,
  onTtsVolumeChange,
  microsoftPreloadCount,
  onMicrosoftPreloadCountChange,
  legadoRate,
  onLegadoRateChange,
  legadoConfigs,
  selectedLegadoConfigId,
  onSelectedLegadoConfigIdChange,
  legadoImportText,
  onLegadoImportTextChange,
  onLegadoImport,
  legadoImporting,
  legadoPreloadCount,
  onLegadoPreloadCountChange,
}: ReadingSettingsProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl border-t px-0 sm:max-w-md sm:mx-auto overflow-hidden"
        style={{
          background: "var(--reader-bg)",
          borderColor: "var(--reader-border)",
          boxShadow: "0 -12px 48px -4px rgba(0,0,0,0.18)",
        }}
      >
        {/* Handle + Title */}
        <SheetHeader className="px-5 pt-3.5 pb-4">
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-9 h-1 rounded-full"
              style={{ background: "var(--reader-text)", opacity: 0.12 }}
            />
            <SheetTitle
              className="text-[15px] font-semibold tracking-wide"
              style={{ color: "var(--reader-text)" }}
            >
              阅读设置
            </SheetTitle>
          </div>
        </SheetHeader>

        <div className="px-5 pb-10 max-h-[72vh] overflow-y-auto space-y-6 scrollbar-hide">

          {/* ── 排版 ── */}
          <section>
            <SectionLabel icon={Type} title="排版" />
            <SettingCard>
              {/* Font size row */}
              <div
                className="flex items-center justify-between px-4 py-3.5 border-b"
                style={{ borderColor: "var(--reader-border)" }}
              >
                <span
                  className="text-[14px] font-medium"
                  style={{ color: "var(--reader-text)" }}
                >
                  字体大小
                </span>
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => fontSize > 12 && onFontSizeChange(fontSize - 1)}
                    disabled={fontSize <= 12}
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer",
                      fontSize <= 12 ? "opacity-25 cursor-not-allowed" : "hover:opacity-75 active:opacity-60"
                    )}
                    style={{
                      background: "color-mix(in srgb, var(--reader-text) 10%, transparent)",
                    }}
                  >
                    <Minus
                      className="size-3.5"
                      style={{ color: "var(--reader-text)" }}
                    />
                  </button>

                  <span
                    className="text-[15px] font-bold tabular-nums w-9 text-center"
                    style={{ color: "var(--primary)" }}
                  >
                    {fontSize}
                  </span>

                  <button
                    onClick={() => fontSize < 28 && onFontSizeChange(fontSize + 1)}
                    disabled={fontSize >= 28}
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer",
                      fontSize >= 28 ? "opacity-25 cursor-not-allowed" : "hover:opacity-75 active:opacity-60"
                    )}
                    style={{
                      background: "color-mix(in srgb, var(--reader-text) 10%, transparent)",
                    }}
                  >
                    <Plus
                      className="size-3.5"
                      style={{ color: "var(--reader-text)" }}
                    />
                  </button>
                </div>
              </div>

              {/* Font size preview strip */}
              <div className="flex items-end justify-between px-6 py-3">
                {[12, 16, 20, 24, 28].map((s) => {
                  const isActive = fontSize === s;
                  return (
                    <button
                      key={s}
                      onClick={() => onFontSizeChange(s)}
                      className="flex flex-col items-center gap-1.5 cursor-pointer transition-transform active:scale-90 group"
                    >
                      <span
                        style={{
                          fontSize: s * 0.72,
                          color: isActive ? "var(--primary)" : "var(--reader-text)",
                          opacity: isActive ? 1 : 0.3,
                          fontWeight: isActive ? 700 : 500,
                          lineHeight: 1,
                          transition: "all 0.15s",
                        }}
                      >
                        文
                      </span>
                      <div
                        className="w-1 h-1 rounded-full transition-all"
                        style={{
                          background: isActive ? "var(--primary)" : "var(--reader-text)",
                          opacity: isActive ? 1 : 0.2,
                          transform: isActive ? "scale(1.2)" : "scale(1)",
                        }}
                      />
                    </button>
                  );
                })}
              </div>
            </SettingCard>
          </section>

          {/* ── 主题 ── */}
          <section>
            <SectionLabel icon={Palette} title="主题" />
            <div className="flex gap-3">
              {themeOptions.map((option) => {
                const isActive = theme === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => onThemeChange(option.value)}
                    className="flex-1 flex flex-col items-center gap-2.5 pt-4 pb-3 rounded-2xl transition-all cursor-pointer relative"
                    style={{
                      background: option.bg,
                      border: isActive
                        ? "2px solid var(--primary)"
                        : `2px solid ${option.borderColor}`,
                      opacity: isActive ? 1 : 0.75,
                      transform: isActive ? "scale(1.02)" : "scale(1)",
                      boxShadow: isActive
                        ? "0 4px 16px color-mix(in srgb, var(--primary) 20%, transparent)"
                        : "none",
                      transition: "all 0.18s ease",
                    }}
                  >
                    {/* Active checkmark */}
                    {isActive && (
                      <div
                        className="absolute top-2 right-2 w-4.5 h-4.5 rounded-full flex items-center justify-center"
                        style={{ background: "var(--primary)" }}
                      >
                        <Check className="size-2.5 text-white" strokeWidth={3} />
                      </div>
                    )}

                    {/* Preview lines */}
                    <div className="flex flex-col gap-1.5 w-9 px-0.5">
                      <div className="h-1.5 rounded-full" style={{ background: option.textColor, opacity: 0.65 }} />
                      <div className="h-1.5 rounded-full w-3/4" style={{ background: option.textColor, opacity: 0.4 }} />
                      <div className="h-1.5 rounded-full" style={{ background: option.textColor, opacity: 0.5 }} />
                      <div className="h-1.5 rounded-full w-5/6" style={{ background: option.textColor, opacity: 0.35 }} />
                    </div>

                    <span
                      className="text-[12px] font-semibold"
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
              {/* Engine selector */}
              <SettingRow label="朗读引擎">
                <CompactSelect
                  value={ttsEngine}
                  onChange={(v) => onTtsEngineChange(v as "browser" | "legado")}
                  options={[
                    { value: "browser", label: "微软在线 (Edge)" },
                    { value: "legado", label: "Legado 引擎" },
                  ]}
                />
              </SettingRow>

              {ttsEngine === "browser" && (
                <>
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
                    min={0.5}
                    max={2}
                    step={0.1}
                    onChange={onTtsRateChange}
                    unit="x"
                  />
                  <SliderRow
                    label="音调"
                    value={ttsPitch}
                    min={0.5}
                    max={2}
                    step={0.1}
                    onChange={onTtsPitchChange}
                  />
                  <SliderRow
                    label="音量"
                    value={ttsVolume}
                    min={0}
                    max={1}
                    step={0.1}
                    onChange={onTtsVolumeChange}
                    displayValue={Math.round(ttsVolume * 100)}
                    unit="%"
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
                      ]}
                    />
                  </SettingRow>
                </>
              )}

              {ttsEngine === "legado" && (
                <>
                  <SettingRow label="TTS 配置">
                    <CompactSelect
                      value={selectedLegadoConfigId}
                      onChange={onSelectedLegadoConfigIdChange}
                      placeholder="选择配置"
                      options={
                        legadoConfigs.length === 0
                          ? [{ value: "__none", label: "暂无配置", disabled: true }]
                          : legadoConfigs.map((c) => ({ value: c.id, label: c.name }))
                      }
                    />
                  </SettingRow>

                  <SliderRow
                    label="朗读速度"
                    value={legadoRate}
                    min={0}
                    max={100}
                    step={1}
                    onChange={onLegadoRateChange}
                  />

                  <SettingRow label="预加载段数">
                    <CompactSelect
                      value={String(legadoPreloadCount)}
                      onChange={(v) => onLegadoPreloadCountChange(Number(v))}
                      options={[
                        { value: "1", label: "1 段" },
                        { value: "2", label: "2 段" },
                        { value: "3", label: "3 段" },
                        { value: "5", label: "5 段" },
                      ]}
                    />
                  </SettingRow>

                  {/* Import config */}
                  <div
                    className="px-4 pt-3.5 pb-4 space-y-3"
                    style={{ borderTop: "1px solid var(--reader-border)" }}
                  >
                    <span
                      className="text-[12px] font-semibold uppercase tracking-wider block"
                      style={{ color: "var(--reader-text)", opacity: 0.45 }}
                    >
                      导入配置 (JSON)
                    </span>
                    <Textarea
                      value={legadoImportText}
                      onChange={(e) => onLegadoImportTextChange(e.target.value)}
                      className="min-h-[88px] resize-none text-[13px] rounded-xl border-0 focus-visible:ring-1 focus-visible:ring-primary/30 p-3"
                      placeholder="粘贴 Legado TTS JSON 规则"
                      style={{
                        background: "color-mix(in srgb, var(--reader-text) 6%, transparent)",
                        color: "var(--reader-text)",
                      }}
                    />
                    <Button
                      size="sm"
                      className="w-full h-10 rounded-xl cursor-pointer text-[14px] font-semibold transition-all active:scale-[0.98]"
                      style={{ background: "var(--primary)", color: "white" }}
                      disabled={legadoImporting || !legadoImportText.trim()}
                      onClick={onLegadoImport}
                    >
                      {legadoImporting ? (
                        <span className="flex items-center gap-2">
                          <span
                            className="size-3.5 border-2 rounded-full animate-spin"
                            style={{
                              borderColor: "rgba(255,255,255,0.25)",
                              borderTopColor: "#fff",
                            }}
                          />
                          导入中...
                        </span>
                      ) : (
                        "导入配置"
                      )}
                    </Button>
                  </div>
                </>
              )}
            </SettingCard>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
