import { useState, memo } from "react";
import { Bookmark, Trash2, Pencil, Check, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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
    <ScrollArea className="h-full">
      <div className="p-5 space-y-3">
        {bookmarks.length === 0 ? (
          <div className="text-center py-12">
            <div
              className="reader-liquid-control mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
            >
              <Bookmark className="size-8" style={{ color: "var(--reader-muted-text)" }} />
            </div>
            <p className="text-sm font-medium" style={{ color: "var(--reader-text)" }}>
              暂无书签
            </p>
            <p className="mt-1.5 text-xs" style={{ color: "var(--reader-muted-text)" }}>
              读到关键位置时记一枚书签，会更容易回来看
            </p>
          </div>
        ) : (
          bookmarks.map((bookmark) => (
            <div
              key={bookmark.id}
              className="reader-liquid-surface group cursor-pointer rounded-xl p-4 transition-all duration-200 hover:-translate-y-0.5"
              onClick={() => {
                onBookmarkClick(bookmark.location);
                onClose();
              }}
            >
              {editingId === bookmark.id ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editingLabel}
                    onChange={(e) => setEditingLabel(e.target.value)}
                    className="h-9 flex-1 rounded-lg text-sm"
                    style={{ color: "var(--reader-text)" }}
                    autoFocus
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="reader-liquid-control h-9 w-9 rounded-lg"
                    style={{ color: "var(--reader-primary)" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onBookmarkEdit(bookmark.id, editingLabel);
                      setEditingId(null);
                    }}
                  >
                    <Check className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="reader-liquid-control h-9 w-9 rounded-lg"
                    style={{ color: "var(--reader-muted-text)" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingId(null);
                    }}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold" style={{ color: "var(--reader-text)" }}>
                      {bookmark.label}
                    </p>
                    <div className="mt-2 flex items-center gap-3">
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{
                          color: "var(--reader-primary)",
                          background: "color-mix(in srgb, var(--reader-primary) 12%, transparent)",
                        }}
                      >
                        {(bookmark.progress * 100).toFixed(1)}%
                      </span>
                      <span className="text-xs" style={{ color: "var(--reader-muted-text)" }}>
                        {formatDate(bookmark.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="reader-liquid-control h-8 w-8 rounded-lg"
                      style={{ color: "var(--reader-muted-text)" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(bookmark.id);
                        setEditingLabel(bookmark.label);
                      }}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg border border-red-300/18 bg-[linear-gradient(180deg,rgba(255,120,120,0.18),rgba(255,120,120,0.07))] hover:bg-[linear-gradient(180deg,rgba(255,120,120,0.24),rgba(255,120,120,0.11))]"
                      style={{ color: "var(--reader-destructive, #ef4444)" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onBookmarkDelete(bookmark.id);
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </ScrollArea>
  );
});
