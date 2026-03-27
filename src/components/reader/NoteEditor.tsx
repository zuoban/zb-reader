"use client";

import { useState } from "react";
import { Quote, StickyNote } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface NoteEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedText: string;
  initialContent?: string;
  initialColor?: string;
  onSave: (content: string, color: string) => void;
}

const colorOptions = [
  { value: "#facc15", label: "黄色" },
  { value: "#4ade80", label: "绿色" },
  { value: "#60a5fa", label: "蓝色" },
  { value: "#f87171", label: "红色" },
  { value: "#c084fc", label: "紫色" },
];

export function NoteEditor({
  open,
  onOpenChange,
  selectedText,
  initialContent = "",
  initialColor = "#facc15",
  onSave,
}: NoteEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [color, setColor] = useState(initialColor);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setContent(initialContent);
      setColor(initialColor);
    }
    onOpenChange(nextOpen);
  };

  const handleSave = () => {
    onSave(content, color);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="animate-reader-fade-up sm:max-w-md overflow-hidden rounded-[28px] border backdrop-blur-xl"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--reader-card-bg) 90%, white 10%) 0%, color-mix(in srgb, var(--reader-card-bg) 98%, transparent) 100%)",
          borderColor: "var(--reader-border)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-20"
          style={{
            background:
              "linear-gradient(180deg, color-mix(in srgb, white 42%, transparent) 0%, transparent 100%)",
          }}
        />
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle
                className="flex items-center gap-2 text-base font-semibold"
                style={{ color: "var(--reader-text)" }}
              >
                <StickyNote className="size-4" />
                添加笔记
              </DialogTitle>
              <p
                className="mt-1 text-xs"
                style={{ color: "var(--reader-muted-text)" }}
              >
                保存你的摘录和当下的想法
              </p>
            </div>
            <span
              className="rounded-full px-2.5 py-1 text-xs font-medium"
              style={{
                background:
                  "color-mix(in srgb, var(--reader-primary) 8%, transparent)",
                color: "var(--reader-primary)",
              }}
            >
              笔记
            </span>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div
            className="rounded-[22px] border p-4 pl-4 text-sm"
            style={{
              background:
                "color-mix(in srgb, var(--reader-card-bg) 84%, white 16%)",
              borderColor: "var(--reader-border)",
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="flex size-8 shrink-0 items-center justify-center rounded-full"
                style={{
                  background:
                    "color-mix(in srgb, var(--reader-text) 6%, transparent)",
                  color: "var(--reader-text)",
                }}
              >
                <Quote className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="text-[11px] font-medium tracking-[0.16em]"
                  style={{ color: "var(--reader-muted-text)" }}
                >
                  原文摘录
                </p>
                <div
                  className="mt-2 rounded-2xl border-l-4 px-3.5 py-3 line-clamp-4"
                  style={{
                    borderLeftColor: color,
                    background:
                      "color-mix(in srgb, var(--reader-text) 4%, transparent)",
                    color: "var(--reader-muted-text)",
                  }}
                >
                  {selectedText}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span
              className="text-sm"
              style={{ color: "var(--reader-muted-text)" }}
            >
              颜色
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {colorOptions.map((option) => (
                <button
                  key={option.value}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-2 py-1.5 transition-transform cursor-pointer",
                    color === option.value
                      ? "scale-110"
                      : "border-transparent hover:scale-105"
                  )}
                  style={{
                    background:
                      "color-mix(in srgb, var(--reader-card-bg) 82%, white 18%)",
                    borderColor:
                      color === option.value
                        ? "var(--reader-text)"
                        : "transparent",
                  }}
                  onClick={() => setColor(option.value)}
                  title={option.label}
                >
                  <span
                    className="block size-4 rounded-full"
                    style={{ backgroundColor: option.value }}
                  />
                  <span
                    className="text-[11px] font-medium"
                    style={{ color: "var(--reader-text)" }}
                  >
                    {option.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="写下你的想法..."
            className="min-h-[120px] rounded-[22px]"
            style={{
              background:
                "color-mix(in srgb, var(--reader-card-bg) 88%, white 12%)",
              borderColor: "var(--reader-border)",
              color: "var(--reader-text)",
            }}
            autoFocus
          />
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl cursor-pointer"
            style={{
              borderColor: "var(--reader-border)",
              color: "var(--reader-text)",
            }}
          >
            取消
          </Button>
          <Button
            onClick={handleSave}
            className="rounded-xl cursor-pointer"
            style={{
              background: "var(--reader-primary, #0891B2)",
              color: "#ffffff",
            }}
          >
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
