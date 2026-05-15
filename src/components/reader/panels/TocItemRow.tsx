"use client";

import { useState, useRef, memo } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TocItem } from "@/types/reader";

interface TocItemRowProps {
  item: TocItem;
  level?: number;
  currentHref?: string;
  onTocItemClick: (href: string) => void;
  onClose: () => void;
  parentActive?: boolean;
}

export const TocItemRow = memo(function TocItemRow({
  item,
  level = 0,
  currentHref,
  onTocItemClick,
  onClose,
  parentActive = false,
}: TocItemRowProps) {
  const [expanded, setExpanded] = useState(true);
  const itemRef = useRef<HTMLDivElement>(null);
  const hasChildren = item.subitems && item.subitems.length > 0;

  const isMatched =
    currentHref &&
    (item.href === currentHref || currentHref.startsWith(item.href?.split("#")[0]));

  const isActive = isMatched && !parentActive;

  // Level-based indentation (max 3 levels)
  const clampedLevel = Math.min(level, 3);
  const indentWidth = clampedLevel * 12;

  // Level-based typography
  const textSizeClass = clampedLevel === 0 ? "text-[13.5px]" : clampedLevel === 1 ? "text-[12.5px]" : "text-[11.5px]";
  const weightClass = clampedLevel === 0 ? (isActive ? "font-semibold" : "font-medium") : "font-normal";

  // Dot indicator style by level
  const dotSizeClass = clampedLevel === 0 ? "size-2" : clampedLevel === 1 ? "size-1.5" : "size-1";

  return (
    <div className="flex flex-col">
      <div
        ref={itemRef}
        className={cn(
          "group relative flex items-center rounded-md transition-all duration-200",
          isActive
            ? "bg-[color-mix(in_srgb,var(--reader-primary)_5%,transparent)]"
            : "hover:bg-[color-mix(in_srgb,var(--reader-text)_2%,transparent)]"
        )}
        style={{ marginLeft: `${indentWidth}px` }}
      >
        {/* Active Indicator Bar - Magazine style */}
        {isActive && (
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 rounded-full"
            style={{ background: "var(--reader-primary)" }}
          />
        )}

        {hasChildren ? (
          <button
            className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded transition-colors"
            style={{ color: isActive ? "var(--reader-primary)" : "var(--reader-text)", opacity: isActive ? 0.6 : 0.25 }}
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            {expanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
          </button>
        ) : (
          <div className="size-6 shrink-0 flex items-center justify-center">
            <div className={cn(dotSizeClass, "rounded-full opacity-20 bg-[var(--reader-text)]")} />
          </div>
        )}

        <button
          className={cn(
            "flex-1 min-w-0 cursor-pointer whitespace-nowrap px-1.5 py-1.5 text-left transition-all duration-200",
            textSizeClass,
            weightClass
          )}
          style={{
            color: isActive ? "var(--reader-primary)" : "var(--reader-text)",
            opacity: isActive ? 1 : clampedLevel === 0 ? 0.75 : 0.55,
          }}
          onClick={() => {
            onTocItemClick(item.href);
            onClose();
          }}
          title={item.label}
        >
          <span className="truncate">{item.label}</span>
        </button>

        {isActive && (
          <div className="px-2 flex items-center gap-1 shrink-0">
            {/* Magazine-style reading indicator */}
            <div className="flex gap-[2px] items-end h-[10px]">
              <div className="w-[2px] bg-[var(--reader-primary)] animate-[reader-playing_0.6s_ease-in-out_infinite_alternate] rounded-sm" style={{ height: '40%' }} />
              <div className="w-[2px] bg-[var(--reader-primary)] animate-[reader-playing_0.8s_ease-in-out_infinite_alternate] rounded-sm" style={{ height: '100%' }} />
              <div className="w-[2px] bg-[var(--reader-primary)] animate-[reader-playing_0.5s_ease-in-out_infinite_alternate] rounded-sm" style={{ height: '60%' }} />
            </div>
          </div>
        )}
      </div>

      {hasChildren && expanded && (
        <div className="relative">
          {/* Vertical Nesting Line - more subtle */}
          <div
            className="absolute left-[11px] top-0 bottom-0 w-px rounded-full opacity-[0.06]"
            style={{ background: "var(--reader-text)" }}
          />

          <div className="pl-2 pt-0.5 space-y-0.5">
            {item.subitems!.map((child, index) => (
              <TocItemRow
                key={child.id || `${child.href}-${index}`}
                item={child}
                level={level + 1}
                currentHref={currentHref}
                onTocItemClick={onTocItemClick}
                onClose={onClose}
                parentActive={parentActive || !!isMatched}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
});
