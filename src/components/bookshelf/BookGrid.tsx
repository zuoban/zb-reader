"use client";

import { memo } from "react";
import { BookOpen, Sparkles, Upload } from "lucide-react";
import { BookCard } from "./BookCard";
import type { Book } from "@/lib/db/schema";

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
      <div className="animate-reader-fade-up relative overflow-hidden rounded-[1.25rem] border border-border/60 bg-background/88 px-5 py-10 text-center shadow-[0_16px_36px_-30px_color-mix(in_oklab,var(--foreground)_14%,transparent)] sm:rounded-[1.4rem] sm:px-10 sm:py-14">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />

        <div className="relative flex flex-col items-center justify-center">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/55 px-3 py-1 text-[11px] font-medium text-muted-foreground sm:mb-4 sm:text-xs">
            <Sparkles className="h-3.5 w-3.5" />
            <span>阅读空间待点亮</span>
          </div>
          <div className="flex h-16 w-16 items-center justify-center rounded-[1.05rem] bg-muted text-foreground/80 ring-1 ring-border/60 sm:h-18 sm:w-18 sm:rounded-[1.2rem]">
            <BookOpen className="h-8 w-8 sm:h-10 sm:w-10" />
          </div>
          <h3 className="mt-5 text-lg font-semibold tracking-tight text-foreground sm:mt-6 sm:text-xl">书架还是空的</h3>
          <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground sm:max-w-md">
            点击上方的“上传书籍”按钮，添加你的第一本书，开始打造一个安静又有温度的个人阅读空间。
          </p>
          <div className="mt-5 flex items-center gap-2 rounded-full border border-border/60 bg-background px-3 py-2 text-[11px] text-muted-foreground sm:mt-6 sm:text-xs">
            <Upload className="h-4 w-4" />
            <span>支持 EPUB 格式</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-reader-fade-up grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-3.5 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6" style={{ animationDelay: "120ms" }}>
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
