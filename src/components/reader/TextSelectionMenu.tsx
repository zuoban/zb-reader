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
      onClose={onClose}
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
  onClose?: () => void;
  handleAction: (action: () => void) => void;
}

function TextSelectionMenuInner({
  menuRef,
  position,
  onHighlight,
  onAddNote,
  onCopy,
  onClose,
  handleAction,
}: TextSelectionMenuInnerProps) {
  const [showColors, setShowColors] = useState(false);

  return (
    <div
      ref={menuRef}
      className="animate-reader-fade-up fixed z-[60]"
      style={{
        left: position.x,
        top: position.y,
        transform: "translate(-50%, -100%)",
      }}
    >
      <div className="relative">
        <div
          className={cn(
            "flex items-center gap-1 rounded-[24px] p-1.5 sm:p-2",
            "backdrop-blur-2xl",
            "border",
            "shadow-xl"
          )}
          style={{
            background:
              "color-mix(in srgb, var(--reader-card-bg) 90%, white 10%)",
            borderColor: "color-mix(in srgb, var(--reader-text) 10%, transparent)",
            boxShadow:
              "0 18px 36px -28px color-mix(in srgb, var(--reader-text) 35%, transparent)",
          }}
        >
          {showColors ? (
            <div className="flex items-center gap-2 px-1.5">
              <span
                className="hidden pl-1 text-[11px] font-medium sm:block"
                style={{ color: "var(--reader-muted-text)" }}
              >
                标记颜色
              </span>
              {highlightColors.map((color) => (
                <button
                  key={color.value}
                  className={cn(
                    "flex items-center gap-1 rounded-full border border-transparent px-1.5 py-1 sm:px-2",
                    "transition-all duration-200",
                    "hover:scale-[1.04] hover:border-foreground/20",
                    "cursor-pointer"
                  )}
                  style={{ background: "color-mix(in srgb, var(--reader-card-bg) 82%, white 18%)" }}
                  onClick={() =>
                    handleAction(() => {
                      onHighlight(color.value);
                      setShowColors(false);
                    })
                  }
                  title={color.label}
                >
                  <span
                    className="block size-5 rounded-full border border-black/5 sm:size-5.5"
                    style={{ backgroundColor: color.value }}
                  />
                  <span
                    className="hidden text-[11px] font-medium sm:inline"
                    style={{ color: "var(--reader-text)" }}
                  >
                    {color.label}
                  </span>
                </button>
              ))}
              <Button
                variant="ghost"
                size="icon"
                aria-label="关闭"
                className={cn(
                  "ml-1 h-7.5 w-7.5 sm:h-8 sm:w-8 rounded-full cursor-pointer",
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
                  "gap-1.5 h-8 rounded-full px-3 sm:h-9 sm:px-3.5 cursor-pointer",
                  "transition-all duration-200"
                )}
                style={{
                  color: "var(--reader-text)",
                  background: "transparent",
                }}
                onClick={() => setShowColors(true)}
              >
                <Highlighter className="h-4 w-4" />
                <span className="text-xs font-medium">高亮</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "gap-1.5 h-8 rounded-full px-3 sm:h-9 sm:px-3.5 cursor-pointer",
                  "transition-all duration-200"
                )}
                style={{
                  color: "var(--reader-text)",
                  background: "transparent",
                }}
                onClick={() => handleAction(onAddNote)}
              >
                <StickyNote className="h-4 w-4" />
                <span className="text-xs font-medium">笔记</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "gap-1.5 h-8 rounded-full px-3 sm:h-9 sm:px-3.5 cursor-pointer",
                  "transition-all duration-200"
                )}
                style={{
                  color: "var(--reader-text)",
                  background: "transparent",
                }}
                onClick={() => handleAction(onCopy)}
              >
                <Copy className="h-4 w-4" />
                <span className="text-xs font-medium">复制</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="关闭"
                className="h-8 w-8 rounded-full cursor-pointer transition-all duration-200 sm:h-9 sm:w-9"
                style={{ color: "var(--reader-muted-text)" }}
                onClick={() =>
                  handleAction(() => {
                    onClose?.();
                  })
                }
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 top-full">
          <div
            className="size-2.5 rotate-45 -translate-y-1 border-b border-r"
            style={{
              background: "color-mix(in srgb, var(--reader-card-bg) 90%, white 10%)",
              borderColor: "color-mix(in srgb, var(--reader-text) 10%, transparent)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
