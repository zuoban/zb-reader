"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cacheBook, getCachedBook } from "@/lib/book-cache";
import { logger } from "@/lib/logger";
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
  const [initialLocation, setInitialLocation] = useState<string | undefined>();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [highlights, setHighlights] = useState<ReaderHighlight[]>([]);

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
        setBookmarks(Array.isArray(bmData.bookmarks) ? bmData.bookmarks : []);
        setNotes(Array.isArray(notesData.notes) ? notesData.notes.filter(Boolean) : []);

        let fileData: ArrayBuffer;

        if (cached) {
          fileData = cached;
        } else {
          const fileRes = await fetch(`/api/books/${bookId}/file`);
          if (!fileRes.ok) {
            throw new Error("Failed to load book file");
          }
          fileData = await fileRes.arrayBuffer();
          await cacheBook(bookId, fileData, {
            meta: {
              title: data.book.title,
              author: data.book.author,
              format: data.book.format,
            },
          });
        }

        if (cancelled) {
          return;
        }

        setBookData(fileData);
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

  useEffect(() => {
    const nextHighlights = notes
      .filter((note) => note?.location && note.color)
      .map((note) => ({
        cfiRange: note.location,
        color: note.color || "#facc15",
        id: note.id,
      }));
    setHighlights(nextHighlights);
  }, [notes]);

  return {
    book,
    loading,
    bookData,
    initialLocation,
    bookmarks,
    setBookmarks,
    notes,
    setNotes,
    highlights,
    setHighlights,
  };
}
