"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { cacheBook, getCachedBook } from "@/lib/book-cache";
import { logger } from "@/lib/logger";
import { getLocalProgressManager } from "@/lib/local-progress";
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
        const res = await fetch(`/api/reader/bootstrap?bookId=${bookId}`);
        if (!res.ok) {
          toast.error("书籍不存在");
          onMissingBook();
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        setBook(data.book ?? null);

        const cached = await getCachedBook(bookId);
        if (cancelled) return;

        // Compare server progress with local progress
        const localProgress = await getLocalProgressManager().getLocalProgress(bookId);
        
        let finalProgress = data.progress;
        
        // If local progress exists and is not behind server progress, use it.
        // Local progress usually has more precise location (with scroll ratio).
        if (localProgress && (!finalProgress || localProgress.progress >= (finalProgress.progress || 0))) {
          finalProgress = {
            progress: localProgress.progress,
            location: localProgress.location,
          };
          logger.debug("reader", "Using local progress as it is equal or ahead of server", finalProgress);
        }

        if (finalProgress?.location) {
          setInitialLocation(finalProgress.location);
          onProgressLoaded(finalProgress.progress || 0);
        }
        setInitialProgress(finalProgress ?? null);
        setBookmarks(Array.isArray(data.bookmarks) ? data.bookmarks : []);
        setNotes(Array.isArray(data.notes) ? data.notes.filter(Boolean) : []);

        if (cached) {
          setBookData(cached);
        } else {
          // 下载完整书籍文件并缓存到 IndexedDB
          const downloadRes = await fetch(`/api/books/${bookId}/file`);
          if (!downloadRes.ok) {
            logger.error("reader", "Failed to download book file for caching");
            // 下载失败时回退到代理 URL
            setBookUrl(`/api/books/${bookId}/proxy/`);
          } else {
            const fileData = await downloadRes.arrayBuffer();
            // 缓存到 IndexedDB
            await cacheBook(bookId, fileData);
            setBookData(fileData);
          }
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
