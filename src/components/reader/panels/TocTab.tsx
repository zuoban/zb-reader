import { memo, useMemo, useRef, useEffect } from "react";
import { List } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { TocItem } from "@/types/reader";
import { TocItemRow } from "./TocItemRow";
import { EmptyState } from "@/components/reader/EmptyState";

interface TocTabProps {
  toc: TocItem[];
  currentHref?: string;
  onTocItemClick: (href: string) => void;
  onClose: () => void;
}

interface FlattenedTocItem extends TocItem {
  level: number;
}

function flattenToc(items: TocItem[], level = 0): FlattenedTocItem[] {
  const result: FlattenedTocItem[] = [];
  for (const item of items) {
    result.push({ ...item, level });
    if (item.subitems && item.subitems.length > 0) {
      result.push(...flattenToc(item.subitems, level + 1));
    }
  }
  return result;
}

export const TocTab = memo(function TocTab({
  toc,
  currentHref,
  onTocItemClick,
  onClose,
}: TocTabProps) {
  const flattenedToc = useMemo(() => flattenToc(toc), [toc]);
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: flattenedToc.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44, // Estimated height of TocItemRow
    overscan: 10,
  });

  // Auto-scroll to current chapter
  useEffect(() => {
    if (!currentHref || flattenedToc.length === 0) return;

    const activeIndex = flattenedToc.findIndex((item) => {
      if (!item.href) return false;
      const itemBase = item.href.split("#")[0];
      const currentBase = currentHref.split("#")[0];
      return itemBase === currentBase || currentBase.startsWith(itemBase);
    });

    if (activeIndex !== -1) {
      // Delay to ensure virtualizer has calculated sizes and DOM is ready
      const timer = setTimeout(() => {
        rowVirtualizer.scrollToIndex(activeIndex, { align: "center", behavior: "auto" });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentHref, flattenedToc, rowVirtualizer]);

  return (
    <div className="flex h-full flex-col">
      {/* Header Section */}
      <div className="flex shrink-0 items-center justify-between gap-3 p-5 pb-3">
        <span
          className="text-[10px] font-semibold tracking-[0.15em] uppercase"
          style={{ color: "var(--reader-text)", opacity: 0.75 }}
        >
          书籍目录 · Contents
        </span>
        <div className="px-2 py-0.5 rounded-md" style={{ background: "color-mix(in srgb, var(--reader-primary) 8%, transparent)" }}>
          <p className="text-[10px] font-semibold tracking-tight" style={{ color: "var(--reader-primary)" }}>
            {flattenedToc.length} 个章节
          </p>
        </div>
      </div>

      <div 
        ref={parentRef}
        className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-12"
      >
        {toc.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={List}
              title="暂无目录"
              description="这本书暂时没有可用的章节导航"
            />
          </div>
        ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const item = flattenedToc[virtualRow.index];
              return (
                <div
                  key={virtualRow.key}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <TocItemRow
                    item={{ ...item, subitems: [] }} // Pass empty subitems because we handle hierarchy via level
                    level={item.level}
                    currentHref={currentHref}
                    onTocItemClick={onTocItemClick}
                    onClose={onClose}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});
