"use client";

import { useState, useEffect, useRef } from "react";
import { Highlighter, StickyNote, Copy, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TextSelectionMenuProps {
  visible: boolean;
  position: { x: number; y: number };
  instanceKey?: number;
  onHighlight: (color: string) => void;
  onAddNote: () => void;
  onCopy: () => void;
  onClose?: () => void;
}

const highlightColors = [
  { value: "#facc15", label: "黄色" },
  { value: "#4ade80", label: "绿色" },
  { value: "#60a5fa", label: "蓝色" },
  { value: "#f87171", label: "红色" },
  { value: "#c084fc", label: "紫色" },
];

export function TextSelectionMenu({
  visible,
  position,
  instanceKey = 0,
  onHighlight,
  onAddNote,
  onCopy,
  onClose,
}: TextSelectionMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    if (!visible) return;

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
        }
        onClose?.();
      }
    }

    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [visible, onClose]);

  const handleAction = (action: () => void) => {
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
    }
    action();
  };

  if (!visible) return null;

  return (
    <TextSelectionMenuInner
      key={instanceKey}
      menuRef={menuRef}
      position={position}
      onHighlight={onHighlight}
      onAddNote={onAddNote}
      onCopy={onCopy}
      handleAction={handleAction}
    />
  );
}

interface TextSelectionMenuInnerProps {
  menuRef: React.RefObject<HTMLDivElement | null>;
  position: { x: number; y: number };
  onHighlight: (color: string) => void;
  onAddNote: () => void;
  onCopy: () => void;
  handleAction: (action: () => void) => void;
}

function TextSelectionMenuInner({
  menuRef,
  position,
  onHighlight,
  onAddNote,
  onCopy,
  handleAction,
}: TextSelectionMenuInnerProps) {
  const [showColors, setShowColors] = useState(false);

  return (
    <div
      ref={menuRef}
      className="fixed z-[60] animate-in fade-in-0 zoom-in-95 duration-150"
      style={{
        left: position.x,
        top: position.y,
        transform: "translate(-50%, -100%)",
      }}
    >
      <div className="relative">
        <div className="flex items-center gap-1 rounded-xl bg-card/95 backdrop-blur-xl border border-border/50 shadow-2xl p-1.5">
          {showColors ? (
            <div className="flex items-center gap-2 px-1">
              {highlightColors.map((color) => (
                <button
                  key={color.value}
                  className="size-7 rounded-full border-2 border-border/50 transition-all duration-200 hover:scale-125 hover:shadow-md cursor-pointer"
                  style={{ backgroundColor: color.value }}
                  onClick={() => handleAction(() => {
                    onHighlight(color.value);
                    setShowColors(false);
                  })}
                  title={color.label}
                />
              ))}
              <Button
                variant="ghost"
                size="icon"
                className="ml-1 h-7 w-7 text-muted-foreground cursor-pointer transition-all duration-200 hover:bg-primary/10"
                onClick={() => setShowColors(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 h-8 cursor-pointer transition-all duration-200 hover:bg-primary/10 hover:scale-105"
                onClick={() => setShowColors(true)}
              >
                <Highlighter className="h-4 w-4" />
                <span className="text-xs font-medium">高亮</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 h-8 cursor-pointer transition-all duration-200 hover:bg-primary/10 hover:scale-105"
                onClick={() => handleAction(onAddNote)}
              >
                <StickyNote className="h-4 w-4" />
                <span className="text-xs font-medium">笔记</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 h-8 cursor-pointer transition-all duration-200 hover:bg-primary/10 hover:scale-105"
                onClick={() => handleAction(onCopy)}
              >
                <Copy className="h-4 w-4" />
                <span className="text-xs font-medium">复制</span>
              </Button>
            </>
          )}
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 top-full">
          <div className="size-2.5 rotate-45 -translate-y-1.5 bg-card border-b border-r border-border/50" />
        </div>
      </div>
    </div>
  );
}
