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
      <div className="surface-glass surface-elevated animate-reader-fade-up relative overflow-hidden rounded-[2rem] px-6 py-12 text-center sm:px-12 sm:py-16">
        <div className="liquid-hairline absolute inset-x-8 top-0 h-px opacity-50" />

        <div className="relative flex flex-col items-center justify-center">
          <div className="liquid-control mb-4 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[11px] font-semibold text-muted-foreground sm:mb-6 sm:text-xs">
            <Sparkles className="h-4 w-4 text-[color:var(--cta)]" />
            <span className="tracking-wide">阅读空间待点亮</span>
          </div>
          <div className="liquid-control flex h-20 w-20 items-center justify-center rounded-[1.75rem] text-foreground/90 sm:h-22 sm:w-22">
            <BookOpen className="h-10 w-10 sm:h-12 sm:w-12" />
          </div>
          <h3 className="mt-6 text-xl font-bold tracking-tight text-foreground sm:mt-8 sm:text-2xl">{emptyTitle}</h3>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground/90 sm:max-w-md sm:text-[0.95rem]">
            {emptyDescription}
          </p>
          <div className="liquid-control mt-6 flex items-center gap-2.5 rounded-xl px-4 py-2 text-[11px] font-medium text-muted-foreground sm:mt-8 sm:text-xs">
            <Upload className="h-4 w-4" />
            <span className="tracking-wide">支持 EPUB 格式</span>
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
