"use client";

import { useState } from "react";
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
        className="sm:max-w-md rounded-2xl backdrop-blur-xl border"
        style={{
          background: "var(--reader-card-bg)",
          borderColor: "var(--reader-border)",
        }}
      >
        <DialogHeader>
          <DialogTitle
            className="text-base font-semibold"
            style={{ color: "var(--reader-text)" }}
          >
            添加笔记
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div
            className="rounded-xl p-3 pl-4 border-l-4 text-sm line-clamp-4 border"
            style={{
              borderLeftColor: color,
              background: "var(--reader-border)",
              borderColor: "var(--reader-border)",
              color: "var(--reader-muted-text)",
            }}
          >
            {selectedText}
          </div>

          <div className="flex items-center gap-3">
            <span
              className="text-sm"
              style={{ color: "var(--reader-muted-text)" }}
            >
              颜色
            </span>
            <div className="flex items-center gap-2">
              {colorOptions.map((option) => (
                <button
                  key={option.value}
                  className={cn(
                    "size-7 rounded-full border-2 transition-transform cursor-pointer",
                    color === option.value
                      ? "scale-110"
                      : "border-transparent hover:scale-105"
                  )}
                  style={{
                    backgroundColor: option.value,
                    borderColor:
                      color === option.value
                        ? "var(--reader-text)"
                        : "transparent",
                  }}
                  onClick={() => setColor(option.value)}
                  title={option.label}
                />
              ))}
            </div>
          </div>

          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="写下你的想法..."
            className="min-h-[100px] rounded-xl"
            style={{
              background: "var(--reader-card-bg)",
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
