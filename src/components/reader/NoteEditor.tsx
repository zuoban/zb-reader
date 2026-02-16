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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>添加笔记</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 选中文本引用 */}
          <div
            className="rounded-md bg-muted/50 p-3 pl-4 border-l-4 text-sm text-muted-foreground line-clamp-4"
            style={{ borderLeftColor: color }}
          >
            {selectedText}
          </div>

          {/* 颜色选择器 */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">颜色</span>
            <div className="flex items-center gap-2">
              {colorOptions.map((option) => (
                <button
                  key={option.value}
                  className={`size-7 rounded-full border-2 transition-transform hover:scale-110 ${
                    color === option.value
                      ? "border-foreground scale-110"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: option.value }}
                  onClick={() => setColor(option.value)}
                  title={option.label}
                />
              ))}
            </div>
          </div>

          {/* 笔记内容 */}
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="写下你的想法..."
            className="min-h-[100px]"
            autoFocus
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
