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
    estimateSize: () => 110, // Average height of a bookmark card
    overscan: 5,
  });

  return (
    <div className="flex h-full flex-col">
      {/* Header Section */}
      <div className="flex shrink-0 items-center gap-2 p-6 pb-4">
        <span
          className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-30"
          style={{ color: "var(--reader-text)" }}
        >
          我的书签 · Bookmarks
        </span>
      </div>

      <div 
        ref={parentRef}
        className="flex-1 overflow-y-auto scrollbar-hide px-6 pb-12"
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
                    paddingBottom: "16px", // Gap between items
                  }}
                >
                  <div
                    className="reader-liquid-surface group relative overflow-hidden rounded-[24px] p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl active:scale-[0.98] h-full"
                    onClick={() => {
                      if (editingId !== bookmark.id) {
                        onBookmarkClick(bookmark.location);
                        onClose();
                      }
                    }}
                  >
                    {/* Accent Background Gradient */}
                    <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.05),transparent)] pointer-events-none" />

                    {editingId === bookmark.id ? (
                      <div className="relative flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <Input
                              value={editingLabel}
                              onChange={(e) => setEditingLabel(e.target.value)}
                              className="reader-liquid-control h-11 w-full rounded-2xl border-0 px-4 text-sm font-semibold shadow-none focus:ring-2 focus:ring-[var(--reader-primary)]"
                              style={{ 
                                color: "var(--reader-text)",
                                background: "color-mix(in srgb, var(--reader-text) 5%, transparent)"
                              }}
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="reader-liquid-control rounded-full px-4 h-9 text-xs font-bold"
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
                            className="rounded-full px-5 h-9 text-xs font-bold shadow-lg"
                            style={{ 
                              background: "var(--reader-primary)",
                              color: "var(--reader-bg)"
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onBookmarkEdit(bookmark.id, editingLabel);
                              setEditingId(null);
                            }}
                          >
                            保存修改
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="relative flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-3">
                            <span
                              className="text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm"
                              style={{
                                color: "var(--reader-bg)",
                                background: "var(--reader-primary)",
                              }}
                            >
                              {(bookmark.progress * 100).toFixed(1)}%
                            </span>
                            <span className="text-[10px] font-bold tracking-widest opacity-30" style={{ color: "var(--reader-text)" }}>
                              {formatDate(bookmark.createdAt)}
                            </span>
                          </div>
                          <p 
                            className="line-clamp-2 text-[15px] font-bold leading-relaxed tracking-tight" 
                            style={{ color: "var(--reader-text)" }}
                          >
                            {bookmark.label}
                          </p>
                        </div>
                        
                        <div className="flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="reader-liquid-control size-9 rounded-xl hover:scale-110 active:scale-90"
                            style={{ color: "var(--reader-text)" }}
                            aria-label="编辑书签"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingId(bookmark.id);
                              setEditingLabel(bookmark.label);
                            }}
                          >
                            <Pencil className="size-4.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-9 rounded-xl border border-red-300/18 bg-[linear-gradient(180deg,rgba(255,120,120,0.18),rgba(255,120,120,0.07))] hover:scale-110 active:scale-90"
                            style={{ color: "var(--reader-destructive, #ef4444)" }}
                            aria-label="删除书签"
                            onClick={(e) => {
                              e.stopPropagation();
                              onBookmarkDelete(bookmark.id);
                            }}
                          >
                            <Trash2 className="size-4.5" />
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
