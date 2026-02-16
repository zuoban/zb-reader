"use client";

import { Book, ReadingProgress } from "@/lib/db/schema";
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
      <div className="flex flex-col items-center justify-center py-24">
        <div className="p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 mb-6">
          <BookOpen className="h-20 w-20 text-primary/30" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">书架是空的</h3>
        <p className="text-muted-foreground text-sm max-w-md text-center">
          点击上方的&ldquo;上传书籍&rdquo;按钮添加你的第一本书
        </p>
        <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
          <Upload className="h-4 w-4" />
          <span>支持 EPUB, PDF, TXT, MOBI 格式</span>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
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
