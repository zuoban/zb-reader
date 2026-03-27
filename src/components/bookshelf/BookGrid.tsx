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
      <div className="animate-reader-fade-up flex flex-col items-center justify-center py-20">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <BookOpen className="h-10 w-10" />
        </div>
        <h3 className="mt-6 text-lg font-semibold text-foreground">书架是空的</h3>
        <p className="mt-1 text-sm text-muted-foreground text-center max-w-sm">
          点击上方的"上传书籍"按钮添加你的第一本书
        </p>
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Upload className="h-4 w-4" />
          <span>支持 EPUB、TXT 格式</span>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-reader-fade-up grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6" style={{ animationDelay: "120ms" }}>
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
