import { useState, useRef, useEffect, memo } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TocItem } from "@/types/reader";

interface TocItemRowProps {
  item: TocItem;
  level?: number;
  currentHref?: string;
  onTocItemClick: (href: string) => void;
  onClose: () => void;
}

export const TocItemRow = memo(function TocItemRow({
  item,
  level = 0,
  currentHref,
  onTocItemClick,
  onClose,
}: TocItemRowProps) {
  const [expanded, setExpanded] = useState(true);
  const itemRef = useRef<HTMLButtonElement>(null);
  const hasChildren = item.subitems && item.subitems.length > 0;

  const isActive =
    currentHref &&
    (item.href === currentHref || currentHref.startsWith(item.href?.split("#")[0]));

  useEffect(() => {
    if (isActive && itemRef.current) {
      itemRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isActive]);

  return (
    <div>
      <div className="group flex items-center">
        {hasChildren ? (
          <button
            className="shrink-0 rounded-lg p-1.5 transition-all duration-200 hover:bg-[color-mix(in_srgb,var(--reader-text)_8%,transparent)] cursor-pointer"
            style={{ color: "var(--reader-muted-text)" }}
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </button>
        ) : (
          <span className="shrink-0 w-8" />
        )}

        <button
          ref={itemRef}
          className={cn(
            "flex-1 cursor-pointer truncate rounded-lg px-3 py-2 text-left text-sm transition-all duration-200",
            isActive && "font-semibold"
          )}
          style={{
            paddingLeft: `${level * 12 + 8}px`,
            color: isActive ? "var(--reader-primary)" : "var(--reader-text)",
            background: isActive
              ? "color-mix(in srgb, var(--reader-primary) 10%, transparent)"
              : "transparent",
          }}
          onClick={() => {
            onTocItemClick(item.href);
            onClose();
          }}
          title={item.label}
        >
          {item.label}
        </button>
      </div>

      {hasChildren && expanded && (
        <div
          className="border-l-2 ml-4 pl-2"
          style={{ borderColor: "var(--reader-border)" }}
        >
          {item.subitems!.map((child, index) => (
            <TocItemRow
              key={child.id || `${child.href}-${index}`}
              item={child}
              level={level + 1}
              currentHref={currentHref}
              onTocItemClick={onTocItemClick}
              onClose={onClose}
            />
          ))}
        </div>
      )}
    </div>
  );
});
