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
  return (
    <ScrollArea
      className="h-full"
      viewportClassName="reader-toc-scroll-viewport"
      showHorizontalScrollbar
    >
      <div className="w-max min-w-full p-5 pr-8">
        {toc.length === 0 ? (
          <EmptyState
            icon={List}
            title="暂无目录"
            description="这本书暂时没有可用的章节导航"
          />
        ) : (
          <>
            <div
              className="mb-4 px-3 py-2 rounded-xl"
              style={{ background: "color-mix(in srgb, var(--reader-primary) 8%, transparent)" }}
            >
              <p className="text-xs font-medium" style={{ color: "var(--reader-primary)" }}>
                共 {countTocItems(toc)} 章
              </p>
            </div>
            {toc.map((item, index) => (
              <TocItemRow
                key={item.id || `${item.href}-${index}`}
                item={item}
                currentHref={currentHref}
                onTocItemClick={onTocItemClick}
                onClose={onClose}
              />
            ))}
          </>
        )}
      </div>
    </ScrollArea>
  );
});
