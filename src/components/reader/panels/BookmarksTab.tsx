import { useState, memo } from "react";
import { Bookmark, Trash2, Pencil } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
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

  return (
    <ScrollArea className="h-full scrollbar-hide">
      <div className="p-6 pb-12 space-y-8">
        {/* Header Section */}
        <div className="flex items-center gap-2 px-1">
          <span
            className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-30"
            style={{ color: "var(--reader-text)" }}
          >
            我的书签 · Bookmarks
          </span>
        </div>

        {bookmarks.length === 0 ? (
          <EmptyState
            icon={Bookmark}
            title="暂无书签"
            description="读到关键位置时记一枚书签，会更容易回来看"
          />
        ) : (
          <div className="space-y-4">
            {bookmarks.map((bookmark) => (
              <div
                key={bookmark.id}
                className="reader-liquid-surface group relative overflow-hidden rounded-[24px] p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl active:scale-[0.98]"
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
            ))}
          </div>
        )}
      </div>
    </ScrollArea>
  );
});
