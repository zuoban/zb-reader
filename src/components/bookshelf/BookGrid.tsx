"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Sparkles, Upload } from "lucide-react";
import { BookCard } from "./BookCard";
import type { Book } from "@/lib/db/schema";
import { useWindowVirtualizer } from "@tanstack/react-virtual";

// Preload cover images that are about to enter the viewport
function preloadCovers(books: Book[], startIndex: number, endIndex: number) {
  const slice = books.slice(startIndex, Math.min(endIndex + 1, books.length));
  for (const book of slice) {
    if (book.cover) {
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.as = "image";
      link.href = `/api/books/${book.id}/cover?w=400`;
      document.head.appendChild(link);
    }
  }
}

// Debounce utility for resize handler
function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): T {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return ((...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  }) as T;
}

interface BookGridProps {
  books: Book[];
  progressMap: Record<string, number>;
  lastReadAtMap: Record<string, string>;
  spotlightBookId?: string | null;
  selectionMode?: boolean;
  selectedBookIds?: Set<string>;
  emptyTitle?: string;
  emptyDescription?: string;
  onDelete: (id: string) => void;
  onChangeCategory?: (book: Book) => void;
  onToggleSelect?: (id: string) => void;
}

export const BookGrid = memo(function BookGrid({
  books,
  progressMap,
  lastReadAtMap,
  spotlightBookId,
  selectionMode = false,
  selectedBookIds = new Set(),
  emptyTitle = "书架还是空的",
  emptyDescription = "点击上方的'上传书籍'按钮，添加你的第一本书，开始打造一个安静又有温度的个人阅读空间。",
  onDelete,
  onChangeCategory,
  onToggleSelect,
}: BookGridProps) {
  const [columns, setColumns] = useState(2);
  const prevBooksRef = useRef<Book[]>([]);

  const updateColumns = useCallback(() => {
    const width = window.innerWidth;
    if (width >= 1536) setColumns(6);
    else if (width >= 1280) setColumns(5);
    else if (width >= 1024) setColumns(4);
    else if (width >= 640) setColumns(3);
    else setColumns(2);
  }, []);

  // Debounced resize handler to avoid excessive re-renders
  useEffect(() => {
    const debouncedUpdate = debounce(updateColumns, 150);
    updateColumns();
    window.addEventListener("resize", debouncedUpdate);
    return () => window.removeEventListener("resize", debouncedUpdate);
  }, [updateColumns]);

  const rowCount = Math.ceil(books.length / columns);

  const rowHeightMap: Record<number, number> = { 2: 300, 3: 280, 4: 300, 5: 300, 6: 300 };

  const virtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => rowHeightMap[columns] ?? 300,
    overscan: 2,
  });

  // Preload covers for first screen on initial load
  useEffect(() => {
    if (books.length > 0 && books !== prevBooksRef.current) {
      preloadCovers(books, 0, columns * 4);
      prevBooksRef.current = books;
    }
  }, [books, columns]);

  // Preload covers for books about to enter viewport during scroll
  useEffect(() => {
    const virtualItems = virtualizer.getVirtualItems();
    if (virtualItems.length > 0) {
      const firstVisible = virtualItems[0].index;
      const lastVisible = virtualItems[virtualItems.length - 1].index;
      // Preload next 2 rows worth of covers ahead
      const preloadStart = firstVisible * columns;
      const preloadEnd = (lastVisible + 3) * columns;
      preloadCovers(books, preloadStart, preloadEnd);
    }
  }, [books, columns, virtualizer]);

  if (books.length === 0) {
    return (
      <div className="surface-glass surface-elevated animate-reader-fade-up relative mt-4 overflow-hidden rounded-[2.5rem] px-8 py-16 text-center sm:mt-6 sm:px-16 sm:py-24">
        <div className="liquid-hairline absolute inset-x-12 top-0 h-px opacity-60" />

        <div className="relative flex flex-col items-center justify-center">
          <div className="liquid-control mb-5 inline-flex items-center gap-2 rounded-2xl px-4.5 py-2 text-[11px] font-bold text-muted-foreground/90 sm:mb-8 sm:text-xs">
            <Sparkles className="h-4 w-4 text-[color:var(--cta)]" />
            <span className="tracking-widest uppercase opacity-80">阅读空间待开启</span>
          </div>
          <div className="liquid-control flex h-24 w-24 items-center justify-center rounded-[2rem] text-foreground/90 shadow-xl transition-transform duration-500 hover:scale-105 sm:h-28 sm:w-28">
            <BookOpen className="h-11 w-11 sm:h-14 sm:w-14" />
          </div>
          <h3 className="mt-8 text-2xl font-extrabold tracking-tight text-foreground sm:mt-10 sm:text-3xl">{emptyTitle}</h3>
          <p className="mt-4 max-w-sm text-sm font-medium leading-relaxed text-muted-foreground/80 sm:max-w-md sm:text-[1rem]">
            {emptyDescription}
          </p>
          <div className="liquid-control mt-8 flex items-center gap-3 rounded-2xl px-5 py-2.5 text-[11px] font-bold text-muted-foreground/90 transition-all duration-300 hover:bg-foreground/5 sm:mt-12 sm:text-xs">
            <Upload className="h-4 w-4 text-[color:var(--cta)]" />
            <span className="tracking-wide uppercase opacity-75">支持 EPUB 书籍格式</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-reader-fade-up relative w-full" style={{ animationDelay: "120ms" }}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const startIndex = virtualRow.index * columns;
          const rowBooks = books.slice(startIndex, startIndex + columns);

          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 pb-3"
            >
              {rowBooks.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  progress={progressMap[book.id] || 0}
                  lastReadAt={lastReadAtMap[book.id]}
                  spotlight={spotlightBookId === book.id}
                  selectionMode={selectionMode}
                  selected={selectedBookIds.has(book.id)}
                  coverPriority={virtualRow.index === 0}
                  onDelete={onDelete}
                  onChangeCategory={onChangeCategory}
                  onToggleSelect={onToggleSelect}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
});
