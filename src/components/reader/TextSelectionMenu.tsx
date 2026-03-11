"use client";

import { useState, useEffect, useRef } from "react";
import { Highlighter, StickyNote, Copy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
      className="fixed z-[60] animate-in fade-in-0 zoom-in-95 duration-200"
      style={{
        left: position.x,
        top: position.y,
        transform: "translate(-50%, -100%)",
      }}
    >
      <div className="relative">
        <div
          className={cn(
            "flex items-center gap-1.5 rounded-2xl p-1.5 sm:p-2",
            "backdrop-blur-2xl",
            "border",
            "shadow-xl"
          )}
          style={{
            background: "var(--reader-card-bg)",
            borderColor: "var(--reader-border)",
            boxShadow: "0 8px 24px -8px var(--reader-shadow), 0 2px 8px -2px var(--reader-shadow)",
          }}
        >
          {showColors ? (
            <div className="flex items-center gap-2 px-1.5">
              {highlightColors.map((color) => (
                <button
                  key={color.value}
                  className={cn(
                    "size-7.5 sm:size-8 rounded-xl border-2 border-transparent",
                    "transition-all duration-200",
                    "hover:scale-125 hover:shadow-lg hover:border-foreground/30",
                    "cursor-pointer"
                  )}
                  style={{ backgroundColor: color.value }}
                  onClick={() =>
                    handleAction(() => {
                      onHighlight(color.value);
                      setShowColors(false);
                    })
                  }
                  title={color.label}
                />
              ))}
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "ml-1 h-7.5 w-7.5 sm:h-8 sm:w-8 rounded-xl cursor-pointer",
                  "transition-all duration-200"
                )}
                style={{ color: "var(--reader-muted-text)" }}
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
                className={cn(
                  "gap-1.5 h-8 sm:h-9 rounded-xl cursor-pointer",
                  "transition-all duration-200 hover:bg-[var(--reader-primary-light)]"
                )}
                style={{ color: "var(--reader-text)" }}
                onClick={() => setShowColors(true)}
              >
                <Highlighter className="h-4 w-4" />
                <span className="text-xs font-medium">高亮</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "gap-1.5 h-8 sm:h-9 rounded-xl cursor-pointer",
                  "transition-all duration-200 hover:bg-[var(--reader-primary-light)]"
                )}
                style={{ color: "var(--reader-text)" }}
                onClick={() => handleAction(onAddNote)}
              >
                <StickyNote className="h-4 w-4" />
                <span className="text-xs font-medium">笔记</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "gap-1.5 h-8 sm:h-9 rounded-xl cursor-pointer",
                  "transition-all duration-200 hover:bg-[var(--reader-primary-light)]"
                )}
                style={{ color: "var(--reader-text)" }}
                onClick={() => handleAction(onCopy)}
              >
                <Copy className="h-4 w-4" />
                <span className="text-xs font-medium">复制</span>
              </Button>
            </>
          )}
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 top-full">
          <div
            className="size-3 rotate-45 -translate-y-1.5 border-b border-r"
            style={{
              background: "var(--reader-card-bg)",
              borderColor: "var(--reader-border)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
