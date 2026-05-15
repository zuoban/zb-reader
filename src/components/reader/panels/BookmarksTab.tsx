import { useState, memo, useRef } from "react";
import { Bookmark, Trash2, Pencil } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatDate } from "@/lib/utils";
import { EmptyState } from "@/components/reader/EmptyState";

interface BookmarkItem {
  id: string;
  label: string;
  location: string;
  progress: number;
  createdAt: string;
}

interface BookmarksTabProps {
  bookmarks: BookmarkItem[];
  onBookmarkClick: (location: string) => void;
  onBookmarkDelete: (id: string) => void;
  onBookmarkEdit: (id: string, label: string) => void;
  onClose: () => void;
}

export const BookmarksTab = memo(function BookmarksTab({
  bookmarks,
  onBookmarkClick,
  onBookmarkDelete,
  onBookmarkEdit,
  onClose,
}: BookmarksTabProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: bookmarks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52,
    overscan: 5,
  });

  return (
    <div className="flex h-full flex-col">
      <div
        ref={parentRef}
        className="flex-1 overflow-y-auto scrollbar-hide px-5 pb-12"
      >
        {bookmarks.length === 0 ? (
          <div className="pt-10">
            <EmptyState
              icon={Bookmark}
              title="暂无书签"
              description="读到关键位置时记一枚书签，会更容易回来看"
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
              const bookmark = bookmarks[virtualRow.index];
              const isEditing = editingId === bookmark.id;

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
                    paddingBottom: "8px",
                  }}
                >
                  <div
                    className={cn(
                      "group relative overflow-hidden rounded-lg transition-all duration-200 cursor-pointer",
                      isEditing ? "ring-1 ring-[var(--reader-primary)]" : ""
                    )}
                    style={{
                      background: "color-mix(in srgb, var(--reader-card-bg) 50%, transparent)",
                      border: "1px solid color-mix(in srgb, var(--reader-border) 35%, transparent)",
                    }}
                    onClick={() => {
                      if (!isEditing) {
                        onBookmarkClick(bookmark.location);
                        onClose();
                      }
                    }}
                  >
                    {/* Ribbon accent - top right corner */}
                    <div
                      className="absolute top-0 right-0 w-5 h-5"
                      style={{
                        background: "var(--reader-primary)",
                        clipPath: "polygon(0 0, 100% 0, 100% 100%)",
                        opacity: 0.12,
                      }}
                    />

                    {isEditing ? (
                      <div className="relative flex items-center gap-2 px-3.5 py-2.5">
                        {/* Bookmark icon */}
                        <Bookmark className="size-3.5 shrink-0" style={{ color: "var(--reader-primary)", opacity: 0.6 }} />
                        <Input
                          value={editingLabel}
                          onChange={(e) => setEditingLabel(e.target.value)}
                          className="h-7 flex-1 rounded-md px-2 text-[12px] font-medium shadow-none focus-visible:ring-1 focus-visible:ring-[var(--reader-primary)]"
                          style={{
                            color: "var(--reader-text)",
                            background: "color-mix(in srgb, var(--reader-text) 4%, transparent)",
                          }}
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-md h-7 px-2 text-[11px] font-medium shrink-0"
                          style={{ color: "var(--reader-muted-text)" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(null);
                          }}
                        >
                          取消
                        </Button>
                        <Button
                          size="sm"
                          className="rounded-md h-7 px-3 text-[11px] font-medium shrink-0 shadow-none"
                          style={{
                            background: "var(--reader-primary)",
                            color: "var(--reader-bg)",
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onBookmarkEdit(bookmark.id, editingLabel);
                            setEditingId(null);
                          }}
                        >
                          保存
                        </Button>
                      </div>
                    ) : (
                      <div className="relative flex items-center gap-2.5 px-3.5 py-2.5">
                        {/* Bookmark icon */}
                        <Bookmark className="size-3.5 shrink-0" style={{ color: "var(--reader-primary)", opacity: 0.45 }} />

                        {/* Progress badge */}
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 tabular-nums"
                          style={{
                            color: "var(--reader-primary)",
                            background: "color-mix(in srgb, var(--reader-primary) 8%, transparent)",
                          }}
                        >
                          {(bookmark.progress * 100).toFixed(0)}%
                        </span>

                        {/* Label */}
                        <p
                          className="min-w-0 flex-1 truncate text-[13px] font-medium leading-none"
                          style={{ color: "var(--reader-text)", opacity: 0.8 }}
                        >
                          {bookmark.label}
                        </p>

                        {/* Date */}
                        <span className="text-[10px] font-medium shrink-0 tabular-nums" style={{ color: "var(--reader-text)", opacity: 0.3 }}>
                          {formatDate(bookmark.createdAt)}
                        </span>

                        {/* Action buttons */}
                        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity duration-200">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-5 rounded-md shrink-0"
                            style={{ color: "var(--reader-text)", opacity: 0.35 }}
                            aria-label="编辑书签"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingId(bookmark.id);
                              setEditingLabel(bookmark.label);
                            }}
                          >
                            <Pencil className="size-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-5 rounded-md shrink-0"
                            style={{ color: "var(--reader-destructive, #ef4444)", opacity: 0.35 }}
                            aria-label="删除书签"
                            onClick={(e) => {
                              e.stopPropagation();
                              onBookmarkDelete(bookmark.id);
                            }}
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});
