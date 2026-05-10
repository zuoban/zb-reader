"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { cacheBook, getCachedBook } from "@/lib/book-cache";
import { logger } from "@/lib/logger";
import type { ServerProgressSnapshot } from "@/lib/local-progress";
import type { Book, Bookmark, Note } from "@/lib/db/schema";

export interface ReaderHighlight {
  cfiRange: string;
  color: string;
  id: string;
}

interface UseReaderBookDataParams {
  bookId: string;
  onMissingBook: () => void;
  onProgressLoaded: (progress: number) => void;
}

export function useReaderBookData({
  bookId,
  onMissingBook,
  onProgressLoaded,
}: UseReaderBookDataParams) {
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookData, setBookData] = useState<ArrayBuffer | null>(null);
  const [bookUrl, setBookUrl] = useState<string | null>(null);
  const [initialLocation, setInitialLocation] = useState<string | undefined>();
  const [initialProgress, setInitialProgress] = useState<ServerProgressSnapshot | null>();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);

  const highlights = useMemo(
    () =>
      notes
        .filter((note) => note?.location && note.color)
        .map((note) => ({
          cfiRange: note.location,
          color: note.color || "#facc15",
          id: note.id,
        })),
    [notes]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadBook() {
      try {
        const res = await fetch(`/api/books/${bookId}`);
        if (!res.ok) {
          toast.error("书籍不存在");
          onMissingBook();
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        setBook(data.book);

        const [progressRes, bmRes, notesRes, cached] = await Promise.all([
          fetch(`/api/progress?bookId=${bookId}`),
          fetch(`/api/bookmarks?bookId=${bookId}`),
          fetch(`/api/notes?bookId=${bookId}`),
          getCachedBook(bookId),
        ]);

        const [progressData, bmData, notesData] = await Promise.all([
          progressRes.ok ? progressRes.json() : Promise.resolve({}),
          bmRes.ok ? bmRes.json() : Promise.resolve({ bookmarks: [] }),
          notesRes.ok ? notesRes.json() : Promise.resolve({ notes: [] }),
        ]);

        if (cancelled) return;

        if (progressData.progress?.location) {
          setInitialLocation(progressData.progress.location);
          onProgressLoaded(progressData.progress.progress || 0);
        }
        setInitialProgress(progressData.progress ?? null);
        setBookmarks(Array.isArray(bmData.bookmarks) ? bmData.bookmarks : []);
        setNotes(Array.isArray(notesData.notes) ? notesData.notes.filter(Boolean) : []);

        if (cached) {
          setBookData(cached);
        } else {
          // Use on-demand proxy instead of downloading the whole file
          // This satisfies the user's request for "server-side rendering" (on-demand loading)
          setBookUrl(`/api/books/${bookId}/proxy/`);
        }
      } catch (error) {
        logger.error("reader", "加载书籍失败", error);
        toast.error("加载失败");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadBook();

    return () => {
      cancelled = true;
    };
  }, [bookId, onMissingBook, onProgressLoaded]);

  return {
    book,
    loading,
    bookData,
    bookUrl,
    initialLocation,
    initialProgress,
    bookmarks,
    setBookmarks,
    notes,
    setNotes,
    highlights,
  };
}
