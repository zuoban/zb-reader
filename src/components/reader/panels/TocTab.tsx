import { memo } from "react";
import { List } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { TocItem } from "@/types/reader";
import { TocItemRow } from "./TocItemRow";
import { EmptyState } from "@/components/reader/EmptyState";

interface TocTabProps {
  toc: TocItem[];
  currentHref?: string;
  onTocItemClick: (href: string) => void;
  onClose: () => void;
}

function countTocItems(items: TocItem[]): number {
  return items.reduce(
    (acc, item) => acc + 1 + (item.subitems ? countTocItems(item.subitems) : 0),
    0
  );
}

export const TocTab = memo(function TocTab({
  toc,
  currentHref,
  onTocItemClick,
  onClose,
}: TocTabProps) {
  const totalItems = countTocItems(toc);

  return (
    <ScrollArea
      className="h-full scrollbar-hide"
      viewportClassName="reader-toc-scroll-viewport"
      showHorizontalScrollbar
    >
      <div className="p-6 pb-12 space-y-5 min-w-full w-max">
        {/* Header Section */}
        <div className="flex items-center justify-between gap-4 px-1">
          <span
            className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-30"
            style={{ color: "var(--reader-text)" }}
          >
            书籍目录 · Contents
          </span>
          <div
            className="px-2.5 py-1 rounded-full shadow-sm"
            style={{ 
              background: "color-mix(in srgb, var(--reader-primary) 12%, transparent)",
              border: "1px solid color-mix(in srgb, var(--reader-primary) 20%, transparent)"
            }}
          >
            <p className="text-[10px] font-bold tracking-tight" style={{ color: "var(--reader-primary)" }}>
              {totalItems} 个章节
            </p>
          </div>
        </div>

        {toc.length === 0 ? (
          <EmptyState
            icon={List}
            title="暂无目录"
            description="这本书暂时没有可用的章节导航"
          />
        ) : (
          <div className="space-y-1">
            {toc.map((item, index) => (
              <TocItemRow
                key={item.id || `${item.href}-${index}`}
                item={item}
                currentHref={currentHref}
                onTocItemClick={onTocItemClick}
                onClose={onClose}
              />
            ))}
          </div>
        )}
      </div>
    </ScrollArea>
  );
});
