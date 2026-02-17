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
  ttsImmersiveMode: boolean;
  onTtsImmersiveModeChange: (value: boolean) => void;
}

const themeOptions = [
  {
    value: "light" as const,
    label: "白色",
    bg: "#ffffff",
    border: "#e5e7eb",
  },
  {
    value: "dark" as const,
    label: "深色",
    bg: "#1a1a1a",
    border: "#374151",
  },
  {
    value: "sepia" as const,
    label: "护眼",
    bg: "#f4ecd8",
    border: "#d6c9a8",
  },
];

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
  ttsImmersiveMode,
  onTtsImmersiveModeChange,
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
      <SheetContent side="bottom" className="rounded-t-xl">
        <SheetHeader>
          <SheetTitle>阅读设置</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-6">
          {/* 字体大小 */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground">
              字体大小
            </label>
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="icon"
                onClick={handleDecrease}
                disabled={fontSize <= 12}
              >
                <Minus className="size-4" />
                <span className="sr-only">减小字体</span>
              </Button>

              <span className="text-lg font-medium tabular-nums min-w-[3rem] text-center">
                {fontSize}
              </span>

              <Button
                variant="outline"
                size="icon"
                onClick={handleIncrease}
                disabled={fontSize >= 28}
              >
                <Plus className="size-4" />
                <span className="sr-only">增大字体</span>
              </Button>
            </div>
            <div className="flex items-end justify-between px-2">
              <span style={{ fontSize: 12 }} className="text-muted-foreground">
                A
              </span>
              <span style={{ fontSize: 28 }} className="text-muted-foreground">
                A
              </span>
            </div>
          </div>

          {/* 背景主题 */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground">
              背景主题
            </label>
            <div className="flex items-center justify-center gap-6">
              {themeOptions.map((option) => (
                <button
                  key={option.value}
                  className="flex flex-col items-center gap-2"
                  onClick={() => onThemeChange(option.value)}
                >
                  <div
                    className={`relative size-12 rounded-full border-2 transition-all ${
                      theme === option.value
                        ? "ring-2 ring-primary ring-offset-2"
                        : ""
                    }`}
                    style={{
                      backgroundColor: option.bg,
                      borderColor: option.border,
                    }}
                  >
                    {theme === option.value && (
                      <Check
                        className="absolute inset-0 m-auto size-5"
                        style={{
                          color:
                            option.value === "dark" ? "#ffffff" : "#000000",
                        }}
                      />
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {option.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 朗读设置 */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground">
              朗读引擎
            </label>
            <Select
              value={ttsEngine}
              onValueChange={(value) =>
                onTtsEngineChange(value as "browser" | "legado")
              }
            >
              <SelectTrigger className="w-full cursor-pointer">
                <SelectValue placeholder="选择朗读引擎" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="browser">微软在线语音</SelectItem>
                <SelectItem value="legado">Legado 规则</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">朗读沉浸模式</p>
              <p className="text-xs text-muted-foreground">只显示当前朗读段落</p>
            </div>
            <Input
              type="checkbox"
              checked={ttsImmersiveMode}
              onChange={(event) => onTtsImmersiveModeChange(event.currentTarget.checked)}
              className="h-4 w-4 cursor-pointer"
            />
          </div>

          {ttsEngine === "browser" && (
            <>
              <div className="space-y-3">
                <label className="text-sm font-medium text-muted-foreground">
                  语音
                </label>
                <Select
                  value={selectedBrowserVoiceId}
                  onValueChange={onSelectedBrowserVoiceIdChange}
                >
                  <SelectTrigger className="w-full cursor-pointer">
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
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-muted-foreground">
                  语速 ({ttsRate.toFixed(1)})
                </label>
                <Input
                  type="range"
                  min={0.5}
                  max={2}
                  step={0.1}
                  value={ttsRate}
                  className="cursor-pointer"
                  onChange={(event) =>
                    onTtsRateChange(Number(event.currentTarget.value))
                  }
                />
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-muted-foreground">
                  音调 ({ttsPitch.toFixed(1)})
                </label>
                <Input
                  type="range"
                  min={0.5}
                  max={2}
                  step={0.1}
                  value={ttsPitch}
                  className="cursor-pointer"
                  onChange={(event) =>
                    onTtsPitchChange(Number(event.currentTarget.value))
                  }
                />
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-muted-foreground">
                  音量 ({ttsVolume.toFixed(1)})
                </label>
                <Input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={ttsVolume}
                  className="cursor-pointer"
                  onChange={(event) =>
                    onTtsVolumeChange(Number(event.currentTarget.value))
                  }
                />
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-muted-foreground">
                  预加载段数
                </label>
                <Select
                  value={String(microsoftPreloadCount)}
                  onValueChange={(value) =>
                    onMicrosoftPreloadCountChange(Number(value))
                  }
                >
                  <SelectTrigger className="w-full cursor-pointer">
                    <SelectValue placeholder="选择预加载段数" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 段</SelectItem>
                    <SelectItem value="2">2 段</SelectItem>
                    <SelectItem value="3">3 段</SelectItem>
                    <SelectItem value="5">5 段</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {ttsEngine === "legado" && (
            <>
              <div className="space-y-3">
                <label className="text-sm font-medium text-muted-foreground">
                  朗读速度 ({Math.round(legadoRate)})
                </label>
                <Input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={legadoRate}
                  className="cursor-pointer"
                  onChange={(event) =>
                    onLegadoRateChange(Number(event.currentTarget.value))
                  }
                />
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-muted-foreground">
                  预加载段数
                </label>
                <Select
                  value={String(legadoPreloadCount)}
                  onValueChange={(value) =>
                    onLegadoPreloadCountChange(Number(value))
                  }
                >
                  <SelectTrigger className="w-full cursor-pointer">
                    <SelectValue placeholder="选择预加载段数" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 段</SelectItem>
                    <SelectItem value="2">2 段</SelectItem>
                    <SelectItem value="3">3 段</SelectItem>
                    <SelectItem value="5">5 段</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-muted-foreground">
                  已导入配置
                </label>
                <Select
                  value={selectedLegadoConfigId}
                  onValueChange={onSelectedLegadoConfigIdChange}
                >
                  <SelectTrigger className="w-full cursor-pointer">
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
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-muted-foreground">
                  导入 Legado 配置(JSON)
                </label>
                <Textarea
                  value={legadoImportText}
                  onChange={(event) =>
                    onLegadoImportTextChange(event.currentTarget.value)
                  }
                  className="min-h-28"
                  placeholder='粘贴 Legado 的 TTS JSON（对象或数组）'
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full cursor-pointer"
                  disabled={legadoImporting || !legadoImportText.trim()}
                  onClick={onLegadoImport}
                >
                  {legadoImporting ? "导入中..." : "导入配置"}
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
