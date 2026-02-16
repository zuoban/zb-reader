"use client";

import { Check, Minus, Plus } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface ReadingSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  theme: "light" | "dark" | "sepia";
  onThemeChange: (theme: "light" | "dark" | "sepia") => void;
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
        </div>
      </SheetContent>
    </Sheet>
  );
}
