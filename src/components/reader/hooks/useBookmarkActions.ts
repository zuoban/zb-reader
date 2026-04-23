import { useCallback } from "react";
import { toast } from "sonner";
import type { Bookmark } from "@/lib/db/schema";

interface UseBookmarkActionsParams {
  bookId: string;
  currentCfiRef: React.MutableRefObject<string | null>;
  currentPage: number | undefined;
  bookmarks: Bookmark[];
  progressRef: React.MutableRefObject<number | null>;
  onBookmarkAdded: (bookmark: Bookmark) => void;
  onBookmarkRemoved: (id: string) => void;
  onBookmarkUpdated: (id: string, updates: Partial<Bookmark>) => void;
  setIsCurrentBookmarked: (value: boolean) => void;
}

interface UseBookmarkActionsReturn {
  handleToggleBookmark: () => Promise<void>;
  handleBookmarkEdit: (id: string, label: string) => Promise<void>;
  handleBookmarkDelete: (id: string) => Promise<void>;
}

/**
 * Handles bookmark CRUD operations with optimistic UI updates.
 *
 * @param params.bookId - The current book's ID
 * @param params.currentCfiRef - Ref holding the current CFI location
 * @param params.currentPage - Current page number
 * @param params.bookmarks - Current list of bookmarks
 * @param params.progressRef - Ref holding the current reading progress
 * @param params.onBookmarkAdded - Called when a new bookmark is created
 * @param params.onBookmarkRemoved - Called when a bookmark is deleted
 * @param params.onBookmarkUpdated - Called when a bookmark label is updated
 * @param params.setIsCurrentBookmarked - Called to update whether current location is bookmarked
 */
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
}: UseBookmarkActionsParams): UseBookmarkActionsReturn {
  const handleToggleBookmark = useCallback(async () => {
    const currentCfi = currentCfiRef.current;
    if (!currentCfi) return;

    const existing = bookmarks.find((b) => b.location === currentCfi);

    if (existing) {
      // Remove bookmark
      try {
        await fetch(`/api/bookmarks/${existing.id}`, { method: "DELETE" });
        onBookmarkRemoved(existing.id);
        setIsCurrentBookmarked(false);
        toast.success("已取消书签");
      } catch {
        toast.error("操作失败");
      }
    } else {
      // Add bookmark
      try {
        const res = await fetch("/api/bookmarks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookId,
            location: currentCfi,
            progress: progressRef.current,
            pageNumber: currentPage,
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
  }, [bookmarks, bookId, currentPage]);

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
  }, []);

  const handleBookmarkDelete = useCallback(async (id: string) => {
    try {
      await fetch(`/api/bookmarks/${id}`, { method: "DELETE" });
      onBookmarkRemoved(id);
      toast.success("已删除书签");
    } catch {
      toast.error("删除失败");
    }
  }, []);

  return { handleToggleBookmark, handleBookmarkEdit, handleBookmarkDelete };
}
