"use client";

import type { Book } from "@/lib/db/schema";
import { BookCard } from "./BookCard";
import { BookOpen, Upload } from "lucide-react";

interface BookGridProps {
  books: Book[];
  progressMap: Record<string, number>;
  onDelete: (id: string) => void;
}

export function BookGrid({ books, progressMap, onDelete }: BookGridProps) {
  if (books.length === 0) {
    return (
      <div className="section-shell flex flex-col items-center justify-center py-20">
        <div className="mb-6 rounded-2xl border border-border/70 bg-card/80 p-5">
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
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {books.map((book) => (
        <BookCard
          key={book.id}
          book={book}
          progress={progressMap[book.id] || 0}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
