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
