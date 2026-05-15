"use client";

import { useState, useEffect, useLayoutEffect, useRef, memo, useCallback } from "react";
import { Highlighter, StickyNote, Copy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { useAnnotation } from "./providers";
import type { ReaderSelectionMenuState } from "@/components/reader/hooks";

const highlightColors = [
  { value: "#facc15", label: "黄色" },
  { value: "#4ade80", label: "绿色" },
  { value: "#60a5fa", label: "蓝色" },
  { value: "#f87171", label: "红色" },
  { value: "#c084fc", label: "紫色" },
];

export const TextSelectionMenu = memo(function TextSelectionMenu() {
  const {
    selectionMenu: { visible, position },
    selectionMenuKey: instanceKey = 0,
    handleHighlight: onHighlight,
    handleAddNote: onAddNote,
    handleCopyText: onCopy,
    setSelectionMenu,
  } = useAnnotation();

  const onClose = useCallback(() => 
    setSelectionMenu((prev: ReaderSelectionMenuState) => ({ ...prev, visible: false })),
  [setSelectionMenu]);

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
});

interface TextSelectionMenuInnerProps {
  menuRef: React.RefObject<HTMLDivElement | null>;
  position: { x: number; y: number; bottom?: number };
  onHighlight: (color: string) => void;
  onAddNote: () => void;
  onCopy: () => void;
  onClose?: () => void;
  handleAction: (action: () => void) => void;
}

const TextSelectionMenuInner = memo(function TextSelectionMenuInner({
  menuRef,
  position,
  onHighlight,
  onAddNote,
  onCopy,
  onClose,
  handleAction,
}: TextSelectionMenuInnerProps) {
  const [showColors, setShowColors] = useState(false);
  const [menuPlacement, setMenuPlacement] = useState({
    left: position.x,
    top: position.y,
    side: "top" as "top" | "bottom",
    arrowLeft: 0,
  });

  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;

    const margin = 8;
    const gap = 8;
    const rect = menu.getBoundingClientRect();
    const anchorX = Math.min(Math.max(position.x, margin), window.innerWidth - margin);
    const idealLeft = anchorX - rect.width / 2;
    const left = Math.min(Math.max(idealLeft, margin), window.innerWidth - rect.width - margin);
    const topAbove = position.y - rect.height - gap;
    const canPlaceAbove = topAbove >= margin;
    const topBelow = (position.bottom ?? position.y) + gap;
    const top = canPlaceAbove
      ? topAbove
      : Math.min(topBelow, window.innerHeight - rect.height - margin);

    setMenuPlacement({
      left,
      top: Math.max(margin, top),
      side: canPlaceAbove ? "top" : "bottom",
      arrowLeft: anchorX - left,
    });
  }, [menuRef, position, showColors]);

  return (
    <div
      ref={menuRef}
      className="animate-reader-fade-up fixed z-[60]"
      style={{
        left: menuPlacement.left,
        top: menuPlacement.top,
      }}
    >
      <div className="relative">
        <div
          className={cn(
            "reader-selection-menu-surface flex items-center gap-1.5 rounded-[20px] p-2 sm:gap-2 sm:p-2"
          )}
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
                    "reader-selection-menu-control flex items-center gap-1 rounded-full border px-1.5 py-1 sm:px-2",
                    "transition-all duration-200 hover:scale-[1.04]",
                    "cursor-pointer"
                  )}
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
                  "reader-selection-menu-control ml-1 h-7.5 w-7.5 rounded-full cursor-pointer sm:h-8 sm:w-8",
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
                  "reader-selection-menu-control gap-1.5 h-8 rounded-full px-3 sm:h-9 sm:px-3.5 cursor-pointer",
                  "transition-all duration-200"
                )}
                style={{
                  color: "var(--reader-text)",
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
                  "reader-selection-menu-control gap-1.5 h-8 rounded-full px-3 sm:h-9 sm:px-3.5 cursor-pointer",
                  "transition-all duration-200"
                )}
                style={{
                  color: "var(--reader-text)",
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
                  "reader-selection-menu-control gap-1.5 h-8 rounded-full px-3 sm:h-9 sm:px-3.5 cursor-pointer",
                  "transition-all duration-200"
                )}
                style={{
                  color: "var(--reader-text)",
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
                className="reader-selection-menu-control h-8 w-8 rounded-full cursor-pointer transition-all duration-200 sm:h-9 sm:w-9"
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

        <div
          className={cn(
            "absolute -translate-x-1/2",
            menuPlacement.side === "top" ? "top-full" : "bottom-full"
          )}
          style={{ left: menuPlacement.arrowLeft }}
        >
          <div
            className={cn(
              "size-2.5 rotate-45 border-[color-mix(in_srgb,var(--reader-text)_10%,transparent)]",
              menuPlacement.side === "top" ? "-translate-y-1 border-b border-r" : "translate-y-1 border-l border-t"
            )}
            style={{
              background: "var(--reader-bg, white)",
            }}
          />
        </div>
      </div>
    </div>
  );
});
