"use client";

import { memo } from "react";
import type { Book } from "@/lib/db/schema";
import { BookCard } from "./BookCard";
import { BookOpen, Upload } from "lucide-react";

interface BookGridProps {
  books: Book[];
  progressMap: Record<string, number>;
  lastReadAtMap: Record<string, string>;
  readingDurationMap?: Record<string, number>;
  spotlightBookId?: string | null;
  onDelete: (id: string) => void;
  onDurationUpdate?: (id: string, newDuration: number) => void;
}

export const BookGrid = memo(function BookGrid({ books, progressMap, lastReadAtMap, readingDurationMap, spotlightBookId, onDelete, onDurationUpdate }: BookGridProps) {
  if (books.length === 0) {
    return (
      <div
        className="section-shell animate-reader-fade-up relative flex flex-col items-center justify-center overflow-hidden py-20"
        style={{
          animationDelay: "100ms",
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--card) 88%, white 12%) 0%, color-mix(in srgb, var(--card) 96%, transparent) 100%)",
          boxShadow:
            "0 22px 56px -42px color-mix(in srgb, var(--foreground) 20%, transparent)",
        }}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(255,255,255,0.14),transparent)]" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.12)_0%,transparent_72%)] blur-3xl" />
        <div className="mb-6 rounded-[26px] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.74),rgba(255,255,255,0.48))] p-5 shadow-[0_18px_40px_-28px_rgba(0,0,0,0.24)] backdrop-blur-md">
          <BookOpen className="h-16 w-16 text-muted-foreground" />
        </div>
        <h3 className="mb-2 text-xl font-semibold text-foreground">书架是空的</h3>
        <p className="text-muted-foreground text-sm max-w-md text-center">
          点击上方的&ldquo;上传书籍&rdquo;按钮添加你的第一本书
        </p>
        <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
          <Upload className="h-4 w-4" />
          <span>支持 EPUB, TXT 格式</span>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-reader-fade-up grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6" style={{ animationDelay: "110ms" }}>
      {books.map((book) => (
        <BookCard
          key={book.id}
          book={book}
          progress={progressMap[book.id] || 0}
          lastReadAt={lastReadAtMap[book.id]}
          readingDuration={readingDurationMap?.[book.id]}
          spotlight={spotlightBookId === book.id}
          onDelete={onDelete}
          onDurationUpdate={onDurationUpdate}
        />
      ))}
    </div>
  );
});
