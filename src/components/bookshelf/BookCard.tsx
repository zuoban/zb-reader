"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { BookOpen, MoreVertical, Trash2 } from "lucide-react";
import type { Book } from "@/lib/db/schema";

interface BookCardProps {
  book: Book;
  progress?: number;
  lastReadAt?: string;
  onDelete: (id: string) => void;
}

export function BookCard({ book, progress = 0, lastReadAt, onDelete }: BookCardProps) {
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const formatLastRead = (dateStr?: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "刚刚";
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays === 1) return "昨天";
    if (diffDays < 7) return `${diffDays}天前`;
    
    return date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
  };

  return (
    <Card className="group relative overflow-hidden rounded-2xl border-border/70 py-0 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
      <Link href={`/reader/${book.id}`} className="block cursor-pointer">
        <div className="aspect-[3/4] bg-muted relative overflow-hidden">
          {book.cover ? (
            <img
              src={`/api/books/${book.id}/cover`}
              alt={book.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-100 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-yellow-950/30" />
              <div className="absolute inset-0 opacity-30" style={{
                backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(212,175,55,0.03) 10px, rgba(212,175,55,0.03) 20px), repeating-linear-gradient(-45deg, transparent, transparent 10px, rgba(212,175,55,0.03) 10px, rgba(212,175,55,0.03) 20px)`
              }} />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.15),transparent_60%)]" />
              
              <div className="absolute inset-0 flex items-center justify-center p-6">
                <div className="relative w-full h-full flex flex-col items-center justify-center">
                  <div className="relative w-20 h-28 sm:w-24 sm:h-32 bg-gradient-to-br from-amber-400 to-orange-500 dark:from-amber-500 dark:to-orange-600 rounded-sm shadow-2xl shadow-amber-500/30 dark:shadow-amber-500/20 transform transition-all duration-300 group-hover:scale-105 group-hover:shadow-amber-500/40 dark:group-hover:shadow-amber-500/30">
                    <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
                    <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-black/5 to-transparent" />
                    <div className="absolute inset-0 border-2 border-white/10" />
                    <div className="relative w-full h-full flex items-center justify-center">
                      <span className="text-3xl sm:text-4xl font-bold text-white drop-shadow-lg">
                        {book.title?.charAt(0) || "书"}
                      </span>
                    </div>
                  </div>
                  <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-20 h-1 bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />
                </div>
              </div>
            </div>
          )}

          {/* Progress overlay */}
          {progress > 0 && (
            <div className="absolute bottom-0 left-0 right-0 border-t border-border/60 bg-card/95 px-3 py-2 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <Progress value={progress * 100} className="h-1.5 sm:h-2 flex-1" />
                <span className="text-xs font-medium text-foreground shrink-0">
                  {Math.round(progress * 100)}%
                </span>
              </div>
            </div>
          )}
        </div>
      </Link>

      <div className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-1 sm:gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm line-clamp-2 sm:line-clamp-1 text-foreground" title={book.title}>
              {book.title}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
              {book.author}
            </p>
            {lastReadAt && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                {formatLastRead(lastReadAt)}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
              {formatSize(book.fileSize)}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="-mr-2 h-8 w-8 shrink-0 border border-transparent transition-all duration-200 hover:border-border/90 hover:bg-accent sm:opacity-0 sm:group-hover:opacity-100"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="surface-glass w-40">
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href={`/reader/${book.id}`} className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  <span>阅读</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer text-destructive focus:text-destructive"
                onClick={() => onDelete(book.id)}
              >
                <Trash2 className="h-4 w-4" />
                <span>删除</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  );
}
