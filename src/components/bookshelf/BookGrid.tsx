"use client";

import { memo } from "react";
import { BookOpen, Sparkles, Upload } from "lucide-react";
import { BookCard } from "./BookCard";
import type { Book } from "@/lib/db/schema";

interface BookGridProps {
  books: Book[];
  progressMap: Record<string, number>;
  lastReadAtMap: Record<string, string>;
  spotlightBookId?: string | null;
  emptyTitle?: string;
  emptyDescription?: string;
  onDelete: (id: string) => void;
  onChangeCategory?: (book: Book) => void;
}

export const BookGrid = memo(function BookGrid({
  books,
  progressMap,
  lastReadAtMap,
  spotlightBookId,
  emptyTitle = "书架还是空的",
  emptyDescription = "点击上方的“上传书籍”按钮，添加你的第一本书，开始打造一个安静又有温度的个人阅读空间。",
  onDelete,
  onChangeCategory,
}: BookGridProps) {
  if (books.length === 0) {
    return (
      <div className="surface-glass surface-elevated animate-reader-fade-up relative overflow-hidden rounded-2xl px-5 py-10 text-center sm:px-10 sm:py-14">
        <div className="liquid-hairline absolute inset-x-5 top-0 h-px" />

        <div className="relative flex flex-col items-center justify-center">
          <div className="liquid-control mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium text-muted-foreground sm:mb-4 sm:text-xs">
            <Sparkles className="h-3.5 w-3.5 text-[color:var(--cta)]" />
            <span>阅读空间待点亮</span>
          </div>
          <div className="liquid-control flex h-16 w-16 items-center justify-center rounded-2xl text-foreground/80 sm:h-18 sm:w-18">
            <BookOpen className="h-8 w-8 sm:h-10 sm:w-10" />
          </div>
          <h3 className="mt-5 text-lg font-semibold tracking-tight text-foreground sm:mt-6 sm:text-xl">{emptyTitle}</h3>
          <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground sm:max-w-md">
            {emptyDescription}
          </p>
          <div className="liquid-control mt-5 flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] text-muted-foreground sm:mt-6 sm:text-xs">
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
          spotlight={spotlightBookId === book.id}
          onDelete={onDelete}
          onChangeCategory={onChangeCategory}
        />
      ))}
    </div>
  );
});
