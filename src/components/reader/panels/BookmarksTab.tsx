import { useState, memo, useRef } from "react";
import { Bookmark, Trash2, Pencil } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";
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
    estimateSize: () => 48,
    overscan: 5,
  });

  return (
    <div className="flex h-full flex-col">
      {/* Header Section */}
      <div className="flex shrink-0 items-center gap-3 p-5 pb-3">
        <span
          className="text-[10px] font-semibold tracking-[0.15em] uppercase"
          style={{ color: "var(--reader-text)", opacity: 0.75 }}
        >
          我的书签 · Bookmarks
        </span>
      </div>

      <div
        ref={parentRef}
        className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-12"
      >
        {bookmarks.length === 0 ? (
          <EmptyState
            icon={Bookmark}
            title="暂无书签"
            description="读到关键位置时记一枚书签，会更容易回来看"
          />
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
                    paddingBottom: "4px",
                  }}
                >
                  <div
                    className="group relative overflow-hidden rounded-lg transition-all duration-200"
                    style={{
                      background: "color-mix(in srgb, var(--reader-text) 3%, transparent)",
                    }}
                    onClick={() => {
                      if (editingId !== bookmark.id) {
                        onBookmarkClick(bookmark.location);
                        onClose();
                      }
                    }}
                  >
                    {editingId === bookmark.id ? (
                      <div className="relative flex items-center gap-2 px-3 py-2">
                        <div
                          className="h-4 w-0.5 shrink-0 rounded-full"
                          style={{ background: "var(--reader-primary)" }}
                        />
                        <Input
                          value={editingLabel}
                          onChange={(e) => setEditingLabel(e.target.value)}
                          className="h-6 flex-1 rounded px-2 text-[11px] font-medium shadow-none focus:ring-1 focus:ring-[var(--reader-primary)]"
                          style={{
                            color: "var(--reader-text)",
                            background: "color-mix(in srgb, var(--reader-text) 5%, transparent)",
                          }}
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded h-6 px-2 text-[10px] font-medium shrink-0"
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
                          className="rounded h-6 px-3 text-[10px] font-medium shrink-0 shadow-none"
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
                      <div className="relative flex items-center gap-2 px-3 py-2">
                        <div
                          className="h-4 w-0.5 shrink-0 rounded-full"
                          style={{ background: "var(--reader-primary)" }}
                        />
                        <span
                          className="text-[9px] font-medium px-1 py-px rounded shrink-0"
                          style={{
                            color: "var(--reader-primary)",
                            background: "color-mix(in srgb, var(--reader-primary) 8%, transparent)",
                          }}
                        >
                          {(bookmark.progress * 100).toFixed(1)}%
                        </span>
                        <p
                          className="min-w-0 flex-1 truncate text-[12px] font-normal leading-none"
                          style={{ color: "var(--reader-text)", opacity: 0.75 }}
                        >
                          {bookmark.label}
                        </p>
                        <span className="text-[9px] font-medium shrink-0 opacity-20" style={{ color: "var(--reader-text)" }}>
                          {formatDate(bookmark.createdAt)}
                        </span>

                        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity duration-200">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-5 rounded shrink-0"
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
                            className="size-5 rounded shrink-0"
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
