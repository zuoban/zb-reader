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

  useEffect(() => {
    if (isActive && itemRef.current) {
      itemRef.current.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    }
  }, [isActive]);

  return (
    <div className="flex flex-col">
      <div 
        ref={itemRef}
        className={cn(
          "group relative flex min-w-max items-center rounded-xl transition-all duration-300",
          isActive 
            ? "bg-[color-mix(in_srgb,var(--reader-primary)_8%,transparent)] shadow-[0_4px_12px_-8px_color-mix(in_srgb,var(--reader-primary)_40%,transparent)]" 
            : "hover:bg-[color-mix(in_srgb,var(--reader-text)_4%,transparent)]"
        )}
        style={{ marginLeft: `${level * 16}px` }}
      >
        {/* Active Indicator Bar */}
        {isActive && (
          <div 
            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full"
            style={{ background: "var(--reader-primary)" }}
          />
        )}

        {hasChildren ? (
          <button
            className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl transition-all hover:scale-110 active:scale-90"
            style={{ color: isActive ? "var(--reader-primary)" : "var(--reader-text)", opacity: isActive ? 1 : 0.4 }}
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </button>
        ) : (
          <div className="size-9 shrink-0 flex items-center justify-center opacity-20">
            <div className="size-1 rounded-full bg-[var(--reader-text)]" />
          </div>
        )}

        <button
          className={cn(
            "flex-1 min-w-max cursor-pointer whitespace-nowrap px-2 py-1.5 text-left transition-all duration-300",
            isActive ? "font-bold text-[14px]" : "text-[13px] font-medium"
          )}
          style={{
            color: isActive ? "var(--reader-primary)" : "var(--reader-text)",
            opacity: isActive ? 1 : 0.8,
          }}
          onClick={() => {
            onTocItemClick(item.href);
            onClose();
          }}
          title={item.label}
        >
          {item.label}
        </button>

        {isActive && (
          <div className="px-4 flex items-center gap-1.5">
            <div className="flex gap-0.5 items-end h-2.5">
              <div className="w-0.5 bg-[var(--reader-primary)] animate-[reader-playing_0.6s_ease-in-out_infinite_alternate]" style={{ height: '40%' }} />
              <div className="w-0.5 bg-[var(--reader-primary)] animate-[reader-playing_0.8s_ease-in-out_infinite_alternate]" style={{ height: '100%' }} />
              <div className="w-0.5 bg-[var(--reader-primary)] animate-[reader-playing_0.5s_ease-in-out_infinite_alternate]" style={{ height: '60%' }} />
            </div>
            <span className="text-[9px] font-bold tracking-widest opacity-40 uppercase italic" style={{ color: "var(--reader-primary)" }}>
              Reading
            </span>
          </div>
        )}
      </div>

      {hasChildren && expanded && (
        <div
          className="relative ml-[17px] mt-0.5 space-y-0.5"
        >
          {/* Vertical Nesting Line */}
          <div 
            className="absolute left-0 top-0 bottom-0 w-[1.5px] rounded-full opacity-[0.08]"
            style={{ background: "var(--reader-text)" }}
          />
          
          <div className="pl-1">
            {item.subitems!.map((child, index) => (
              <TocItemRow
                key={child.id || `${child.href}-${index}`}
                item={child}
                level={0} // Level is handled by the parent's container padding/margin now for better visual line alignment
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
