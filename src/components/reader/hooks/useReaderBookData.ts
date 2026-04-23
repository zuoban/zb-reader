"use client";

import { useEffect, useRef, useState } from "react";
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
  const [bookUrl, setBookUrl] = useState<string | null>(null);
  const [initialLocation, setInitialLocation] = useState<string | undefined>();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [highlights, setHighlights] = useState<ReaderHighlight[]>([]);
  const bookUrlRef = useRef<string | null>(null);

  useEffect(() => {
    async function loadBook() {
      try {
        const res = await fetch(`/api/books/${bookId}`);
        if (!res.ok) {
          toast.error("书籍不存在");
          onMissingBook();
          return;
        }
        const data = await res.json();
        setBook(data.book);

        const progressRes = await fetch(`/api/progress?bookId=${bookId}`);
        const progressData = await progressRes.json();
        if (progressData.progress?.location) {
          setInitialLocation(progressData.progress.location);
          onProgressLoaded(progressData.progress.progress || 0);
        }

        const bmRes = await fetch(`/api/bookmarks?bookId=${bookId}`);
        const bmData = await bmRes.json();
        setBookmarks(bmData.bookmarks || []);

        const notesRes = await fetch(`/api/notes?bookId=${bookId}`);
        const notesData = await notesRes.json();
        setNotes(notesData.notes || []);

        const cached = await getCachedBook(bookId);
        let fileUrl: string;

        if (cached) {
          fileUrl = URL.createObjectURL(new Blob([cached]));
        } else {
          const fileRes = await fetch(`/api/books/${bookId}/file`);
          if (!fileRes.ok) {
            throw new Error("Failed to load book file");
          }
          const fileBuffer = await fileRes.arrayBuffer();
          fileUrl = URL.createObjectURL(new Blob([fileBuffer]));
          await cacheBook(bookId, fileBuffer);
        }

        setBookUrl(fileUrl);
        bookUrlRef.current = fileUrl;
      } catch (error) {
        logger.error("reader", "加载书籍失败", error);
        toast.error("加载失败");
      } finally {
        setLoading(false);
      }
    }

    loadBook();

    return () => {
      if (bookUrlRef.current) {
        URL.revokeObjectURL(bookUrlRef.current);
        bookUrlRef.current = null;
      }
    };
  }, [bookId, onMissingBook, onProgressLoaded]);

  useEffect(() => {
    const nextHighlights = notes
      .filter((note) => note.location && note.color)
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
    bookUrl,
    initialLocation,
    bookmarks,
    setBookmarks,
    notes,
    setNotes,
    highlights,
    setHighlights,
  };
}
