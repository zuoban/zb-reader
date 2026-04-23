import { memo } from "react";
import { List } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { TocItem } from "@/types/reader";
import { TocItemRow } from "./TocItemRow";

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
    <ScrollArea className="h-full">
      <div className="p-5">
        {toc.length === 0 ? (
          <div className="text-center py-12">
            <div
              className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
              style={{ background: "color-mix(in srgb, var(--reader-text) 5%, transparent)" }}
            >
              <List className="size-8" style={{ color: "var(--reader-muted-text)" }} />
            </div>
            <p className="text-sm font-medium" style={{ color: "var(--reader-text)" }}>
              暂无目录
            </p>
            <p className="mt-1.5 text-xs" style={{ color: "var(--reader-muted-text)" }}>
              这本书暂时没有可用的章节导航
            </p>
          </div>
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
