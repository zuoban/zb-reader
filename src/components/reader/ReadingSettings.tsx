"use client";

import { Check, Minus, Plus } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  {
    value: "light" as const,
    label: "白色",
    bg: "#ffffff",
    border: "#e5e7eb",
    shadow: "rgba(0, 0, 0, 0.1)",
  },
  {
    value: "dark" as const,
    label: "深色",
    bg: "#1a1a1a",
    border: "#374151",
    shadow: "rgba(0, 0, 0, 0.3)",
  },
  {
    value: "sepia" as const,
    label: "护眼",
    bg: "#f4ecd8",
    border: "#d6c9a8",
    shadow: "rgba(0, 0, 0, 0.08)",
  },
];

function SettingCard({
  title,
  description,
  children,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-muted/40 border border-border/50 p-4 space-y-3 transition-all duration-200 hover:bg-muted/60 hover:border-border/80">
      {(title || description) && (
        <div className="space-y-0.5">
          {title && <p className="text-sm font-semibold text-foreground">{title}</p>}
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      )}
      {children}
    </div>
  );
}

function SliderWithPreview({
  label,
  value,
  min,
  max,
  step,
  onChange,
  displayValue,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  displayValue?: string;
}) {
  const percentage = ((value - min) / (max - min)) * 100;
  const thumbSize = 20;
  const offset = (thumbSize / 2) - (thumbSize * percentage / 100);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-foreground">{label}</label>
        <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full min-w-[3rem] text-center">
          {displayValue ?? value.toFixed(1)}
        </span>
      </div>
      <div className="relative h-7 flex items-center group/slider">
        {/* 背景轨道 */}
        <div className="absolute inset-x-0 h-2 bg-muted rounded-full overflow-hidden shadow-inner">
          {/* 填充层 - 渐变效果 */}
          <div
            className="h-full bg-gradient-to-r from-primary via-primary to-primary/80 transition-all duration-100 ease-out relative"
            style={{ width: `${percentage}%` }}
          >
            {/* 填充层高光效果 */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
          </div>
        </div>

        {/* 刻度标记（可选，仅在少量刻度时显示） */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-0 pointer-events-none">
          <div className="w-0.5 h-1.5 bg-muted-foreground/30 rounded-full" />
          <div className="w-0.5 h-1.5 bg-muted-foreground/30 rounded-full" />
          <div className="w-0.5 h-1.5 bg-muted-foreground/30 rounded-full" />
        </div>

        <Input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          className="relative z-10 w-full h-full opacity-0 cursor-pointer"
          onChange={(e) => onChange(Number(e.currentTarget.value))}
        />

        {/* 自定义滑块 */}
        <div
          className="absolute top-1/2 -translate-y-1/2 rounded-full bg-primary shadow-xl border-2 border-background pointer-events-none transition-all duration-100 ease-out group-hover/slider:scale-110 group-active/slider:scale-95"
          style={{
            width: thumbSize,
            height: thumbSize,
            left: `calc(${percentage}% - ${thumbSize / 2}px)`,
          }}
        >
          {/* 滑块高光 */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/30 to-transparent" />
          {/* 滑块内阴影 */}
          <div className="absolute inset-[2px] rounded-full bg-primary shadow-inner" />
        </div>
      </div>

      {/* 最小/最大值标签 */}
      <div className="flex justify-between text-xs text-muted-foreground/60 px-0.5">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

function Switch({
  checked,
  onCheckedChange,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative w-12 h-7 rounded-full transition-all duration-300 ease-out cursor-pointer",
        "hover:scale-105 active:scale-95",
        checked ? "bg-primary" : "bg-muted"
      )}
    >
      <div
        className={cn(
          "absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ease-out",
          checked ? "left-7" : "left-1"
        )}
      />
    </button>
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
  const handleDecrease = () => {
    if (fontSize > 12) {
      onFontSizeChange(fontSize - 1);
    }
  };

  const handleIncrease = () => {
    if (fontSize < 28) {
      onFontSizeChange(fontSize + 1);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl border-t border-border/60"
        style={{
          background: "rgba(var(--card-bg-rgb, 255, 255, 255), 0.98)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
        }}
      >
        <SheetHeader className="space-y-3 pb-2">
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-1.5 bg-muted-foreground/30 rounded-full" />
            <SheetTitle className="text-lg font-semibold">阅读设置</SheetTitle>
          </div>
        </SheetHeader>

        <div className="space-y-4 px-2 pb-8 max-h-[70vh] overflow-y-auto">
          {/* 字体大小 */}
          <SettingCard>
            <div className="flex items-center justify-between gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={handleDecrease}
                disabled={fontSize <= 12}
                className="hover:bg-primary/10 hover:scale-110 transition-all duration-200 active:scale-95 shrink-0"
              >
                <Minus className="size-4" />
                <span className="sr-only">减小字体</span>
              </Button>

              <div className="flex-1 flex flex-col items-center gap-1">
                <span className="text-3xl font-bold tabular-nums text-primary">
                  {fontSize}
                </span>
                <div className="flex items-end justify-center gap-6 w-full">
                  <span style={{ fontSize: 12 }} className="text-muted-foreground/60">
                    A
                  </span>
                  <span style={{ fontSize: 28 }} className="text-muted-foreground/60">
                    A
                  </span>
                </div>
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={handleIncrease}
                disabled={fontSize >= 28}
                className="hover:bg-primary/10 hover:scale-110 transition-all duration-200 active:scale-95 shrink-0"
              >
                <Plus className="size-4" />
                <span className="sr-only">增大字体</span>
              </Button>
            </div>
          </SettingCard>

          {/* 背景主题 */}
          <SettingCard>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              背景主题
            </label>
            <div className="flex items-center justify-around">
              {themeOptions.map((option) => (
                <button
                  key={option.value}
                  className="flex flex-col items-center gap-2 group transition-all duration-200 hover:scale-105"
                  onClick={() => onThemeChange(option.value)}
                >
                  <div
                    className={cn(
                      "relative size-14 rounded-2xl border-2 transition-all duration-300",
                      theme === option.value
                        ? "ring-2 ring-primary ring-offset-2 scale-110 shadow-xl"
                        : "shadow-md group-hover:shadow-lg"
                    )}
                    style={{
                      backgroundColor: option.bg,
                      borderColor: option.border,
                    }}
                  >
                    {theme === option.value && (
                      <Check
                        className="absolute inset-0 m-auto size-6 animate-in zoom-in duration-200"
                        style={{
                          color: option.value === "dark" ? "#ffffff" : "#000000",
                        }}
                      />
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-xs transition-colors",
                      theme === option.value
                        ? "font-semibold text-primary"
                        : "text-muted-foreground"
                    )}
                  >
                    {option.label}
                  </span>
                </button>
              ))}
            </div>
          </SettingCard>

          {/* 朗读设置分组 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <div className="w-1 h-4 bg-primary rounded-full" />
              <h3 className="text-sm font-semibold text-foreground">朗读设置</h3>
            </div>

            {/* 朗读引擎 */}
            <SettingCard>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                朗读引擎
              </label>
              <Select
                value={ttsEngine}
                onValueChange={(value) =>
                  onTtsEngineChange(value as "browser" | "legado")
                }
              >
                <SelectTrigger className="w-full cursor-pointer h-11">
                  <SelectValue placeholder="选择朗读引擎" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="browser">微软在线语音</SelectItem>
                  <SelectItem value="legado">Legado 规则</SelectItem>
                </SelectContent>
              </Select>
            </SettingCard>

            {ttsEngine === "browser" && (
              <>
                {/* 语音选择 */}
                <SettingCard>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    选择语音
                  </label>
                  <Select
                    value={selectedBrowserVoiceId}
                    onValueChange={onSelectedBrowserVoiceIdChange}
                  >
                    <SelectTrigger className="w-full cursor-pointer h-11">
                      <SelectValue placeholder="选择语音" />
                    </SelectTrigger>
                    <SelectContent>
                      {browserVoices.length === 0 ? (
                        <SelectItem value="__none" disabled>
                          未检测到可用语音
                        </SelectItem>
                      ) : (
                        browserVoices.map((voice) => (
                          <SelectItem key={voice.id} value={voice.id}>
                            {voice.name} ({voice.lang})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </SettingCard>

                {/* 语速 */}
                <SettingCard>
                  <SliderWithPreview
                    label="语速"
                    value={ttsRate}
                    min={0.5}
                    max={2}
                    step={0.1}
                    onChange={onTtsRateChange}
                  />
                </SettingCard>

                {/* 音调 */}
                <SettingCard>
                  <SliderWithPreview
                    label="音调"
                    value={ttsPitch}
                    min={0.5}
                    max={2}
                    step={0.1}
                    onChange={onTtsPitchChange}
                  />
                </SettingCard>

                {/* 音量 */}
                <SettingCard>
                  <SliderWithPreview
                    label="音量"
                    value={ttsVolume}
                    min={0}
                    max={1}
                    step={0.1}
                    onChange={onTtsVolumeChange}
                  />
                </SettingCard>

                {/* 预加载段数 */}
                <SettingCard>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    预加载段数
                  </label>
                  <Select
                    value={String(microsoftPreloadCount)}
                    onValueChange={(value) =>
                      onMicrosoftPreloadCountChange(Number(value))
                    }
                  >
                    <SelectTrigger className="w-full cursor-pointer h-11">
                      <SelectValue placeholder="选择预加载段数" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 段</SelectItem>
                      <SelectItem value="2">2 段</SelectItem>
                      <SelectItem value="3">3 段</SelectItem>
                      <SelectItem value="5">5 段</SelectItem>
                    </SelectContent>
                  </Select>
                </SettingCard>
              </>
            )}

            {ttsEngine === "legado" && (
              <>
                {/* 朗读速度 */}
                <SettingCard>
                  <SliderWithPreview
                    label="朗读速度"
                    value={legadoRate}
                    min={0}
                    max={100}
                    step={1}
                    onChange={onLegadoRateChange}
                    displayValue={String(Math.round(legadoRate))}
                  />
                </SettingCard>

                {/* 预加载段数 */}
                <SettingCard>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    预加载段数
                  </label>
                  <Select
                    value={String(legadoPreloadCount)}
                    onValueChange={(value) =>
                      onLegadoPreloadCountChange(Number(value))
                    }
                  >
                    <SelectTrigger className="w-full cursor-pointer h-11">
                      <SelectValue placeholder="选择预加载段数" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 段</SelectItem>
                      <SelectItem value="2">2 段</SelectItem>
                      <SelectItem value="3">3 段</SelectItem>
                      <SelectItem value="5">5 段</SelectItem>
                    </SelectContent>
                  </Select>
                </SettingCard>

                {/* 已导入配置 */}
                <SettingCard>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    已导入配置
                  </label>
                  <Select
                    value={selectedLegadoConfigId}
                    onValueChange={onSelectedLegadoConfigIdChange}
                  >
                    <SelectTrigger className="w-full cursor-pointer h-11">
                      <SelectValue placeholder="选择配置" />
                    </SelectTrigger>
                    <SelectContent>
                      {legadoConfigs.length === 0 ? (
                        <SelectItem value="__none" disabled>
                          暂无配置，请先导入
                        </SelectItem>
                      ) : (
                        legadoConfigs.map((config) => (
                          <SelectItem key={config.id} value={config.id}>
                            {config.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </SettingCard>

                {/* 导入配置 */}
                <SettingCard>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    导入 Legado 配置 (JSON)
                  </label>
                  <Textarea
                    value={legadoImportText}
                    onChange={(event) =>
                      onLegadoImportTextChange(event.currentTarget.value)
                    }
                    className="min-h-24 resize-none font-mono text-xs"
                    placeholder='粘贴 Legado 的 TTS JSON（对象或数组）'
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full cursor-pointer transition-all duration-200",
                      "hover:bg-primary/10 hover:border-primary/30"
                    )}
                    disabled={legadoImporting || !legadoImportText.trim()}
                    onClick={onLegadoImport}
                  >
                    {legadoImporting ? (
                      <span className="flex items-center gap-2">
                        <span className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        导入中...
                      </span>
                    ) : (
                      "导入配置"
                    )}
                  </Button>
                </SettingCard>
              </>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
