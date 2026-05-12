"use client";

import React, { createContext, useContext, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useReaderBookData, type ReaderHighlight } from "@/components/reader/hooks/useReaderBookData";
import { useReaderContext } from "@/components/reader/ReaderContext";
import type { Book, Bookmark, Note } from "@/lib/db/schema";
import type { ServerProgressSnapshot } from "@/lib/local-progress";

interface BookDataContextValue {
  book: Book | null;
  loading: boolean;
  bookData: ArrayBuffer | null;
  bookUrl: string | null;
  initialLocation: string | undefined;
  initialProgress: ServerProgressSnapshot | null | undefined;
  bookmarks: Bookmark[];
  setBookmarks: React.Dispatch<React.SetStateAction<Bookmark[]>>;
  notes: Note[];
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
  highlights: ReaderHighlight[];
}

const BookDataContext = createContext<BookDataContextValue | null>(null);

export function BookDataProvider({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const bookId = params.bookId as string;
  const { setProgress } = useReaderContext();

  const handleMissingBook = useCallback(() => {
    router.push("/bookshelf");
  }, [router]);

  const handleProgressLoaded = useCallback((loadedProgress: number) => {
    setProgress(loadedProgress);
  }, [setProgress]);

  const data = useReaderBookData({
    bookId,
    onMissingBook: handleMissingBook,
    onProgressLoaded: handleProgressLoaded,
  });

  return (
    <BookDataContext.Provider value={data}>
      {children}
    </BookDataContext.Provider>
  );
}

export function useBookData() {
  const context = useContext(BookDataContext);
  if (!context) {
    throw new Error("useBookData must be used within a BookDataProvider");
  }
  return context;
}
