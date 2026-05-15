import { useCallback } from "react";
import { toast } from "sonner";
import type { Bookmark } from "@/lib/db/schema";

interface UseBookmarkActionsParams {
  bookId: string;
  currentCfiRef: React.MutableRefObject<string | null>;
  currentPage: number | undefined;
  bookmarks: Bookmark[];
  progressRef: React.MutableRefObject<number>;
  onBookmarkAdded: (bookmark: Bookmark) => void;
  onBookmarkRemoved: (id: string) => void;
  onBookmarkUpdated: (id: string, updates: Partial<Bookmark>) => void;
  setIsCurrentBookmarked: (value: boolean) => void;
  getCurrentText: () => string | null;
}

interface UseBookmarkActionsReturn {
  handleToggleBookmark: () => Promise<void>;
  handleBookmarkEdit: (id: string, label: string) => Promise<void>;
  handleBookmarkDelete: (id: string) => Promise<void>;
}

function truncateLabel(text: string | null, maxLength = 5): string {
  if (!text) return "未命名书签";
  const trimmed = text.trim();
  if (!trimmed) return "未命名书签";
  return trimmed.slice(0, maxLength);
}

export function useBookmarkActions({
  bookId,
  currentCfiRef,
  currentPage,
  bookmarks,
  progressRef,
  onBookmarkAdded,
  onBookmarkRemoved,
  onBookmarkUpdated,
  setIsCurrentBookmarked,
  getCurrentText,
}: UseBookmarkActionsParams): UseBookmarkActionsReturn {
  const handleToggleBookmark = useCallback(async () => {
    const currentCfi = currentCfiRef.current;
    if (!currentCfi) return;

    const existing = bookmarks.find((b) => b.location === currentCfi);

    if (existing) {
      try {
        await fetch(`/api/bookmarks/${existing.id}`, { method: "DELETE" });
        onBookmarkRemoved(existing.id);
        setIsCurrentBookmarked(false);
        toast.success("已取消书签");
      } catch {
        toast.error("操作失败");
      }
    } else {
      try {
        const labelText = truncateLabel(getCurrentText());
        const res = await fetch("/api/bookmarks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookId,
            location: currentCfi,
            progress: progressRef.current,
            pageNumber: currentPage,
            label: labelText,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          onBookmarkAdded(data.bookmark);
          setIsCurrentBookmarked(true);
          toast.success("已添加书签");
        }
      } catch {
        toast.error("操作失败");
      }
    }
  }, [bookId, currentCfiRef, bookmarks, currentPage, progressRef, onBookmarkAdded, onBookmarkRemoved, setIsCurrentBookmarked, getCurrentText]);

  const handleBookmarkEdit = useCallback(async (id: string, label: string) => {
    try {
      await fetch(`/api/bookmarks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      onBookmarkUpdated(id, { label } as Partial<Bookmark>);
    } catch {
      toast.error("修改失败");
    }
  }, [onBookmarkUpdated]);

  const handleBookmarkDelete = useCallback(async (id: string) => {
    try {
      await fetch(`/api/bookmarks/${id}`, { method: "DELETE" });
      onBookmarkRemoved(id);
      toast.success("已删除书签");
    } catch {
      toast.error("删除失败");
    }
  }, [onBookmarkRemoved]);

  return { handleToggleBookmark, handleBookmarkEdit, handleBookmarkDelete };
}
