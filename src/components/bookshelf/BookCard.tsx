"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { memo, useEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { READER_ROUTE_TRANSITION_EVENT } from "@/components/layout/ReaderRouteTransition";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { BookOpen, MoreVertical, Trash2, Clock } from "lucide-react";
import type { Book } from "@/lib/db/schema";
import { formatDuration } from "@/lib/utils";
import { SetReadingDurationDialog } from "./SetReadingDurationDialog";

// 格式化最后阅读时间
function formatLastRead(dateStr?: string): string | null {
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
}

interface BookCardProps {
  book: Book;
  progress?: number;
  lastReadAt?: string;
  readingDuration?: number;
  spotlight?: boolean;
  onDelete: (id: string) => void;
  onDurationUpdate?: (id: string, newDuration: number) => void;
}

export const BookCard = memo(function BookCard({ book, progress = 0, lastReadAt, readingDuration = 0, spotlight = false, onDelete, onDurationUpdate }: BookCardProps) {
  const router = useRouter();
  const [showDurationDialog, setShowDurationDialog] = useState(false);
  const [localDuration, setLocalDuration] = useState(readingDuration);
  const readerHref = `/reader/${book.id}`;
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    router.prefetch(readerHref);
  };

  const handleOpenReader = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();

    const shouldSkipTransition =
      typeof window === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!shouldSkipTransition) {
      const coverElement = event.currentTarget.querySelector(
        "[data-reader-transition-cover]"
      ) as HTMLElement | null;
      const rect = coverElement?.getBoundingClientRect();

      if (rect) {
        window.dispatchEvent(
          new CustomEvent(READER_ROUTE_TRANSITION_EVENT, {
            detail: {
              href: readerHref,
              title: book.title || "未命名书籍",
              author: book.author || "未知作者",
              coverUrl: book.cover ? `/api/books/${book.id}/cover` : undefined,
              hasCover: Boolean(book.cover),
              format: book.format,
              initial: book.title?.charAt(0) || "书",
              rect: {
                left: rect.left,
                top: rect.top,
                width: rect.width,
                height: rect.height,
              },
            },
          })
        );
      }
    }

    window.setTimeout(
      () => {
        router.push(readerHref);
      },
      shouldSkipTransition ? 0 : 120
    );
  };

  useEffect(() => {
    if (!spotlight) return;

    cardRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });
  }, [spotlight]);

  const hasProgress = progress > 0 && progress < 1;
  const isCompleted = progress >= 1;

  return (
    <Card
      ref={cardRef}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border/60 bg-card transition-all duration-200",
        "hover:-translate-y-0.5 hover:border-border/80 hover:shadow-lg",
        "active:translate-y-0 active:scale-[0.995]",
        spotlight && "animate-pulse-subtle ring-2 ring-primary/30"
      )}
    >
      <Link
        href={readerHref}
        className={cn("block cursor-pointer", spotlight && "animate-reader-fade-up")}
        onMouseEnter={handleMouseEnter}
        onClick={handleOpenReader}
      >
        <div
          className="aspect-[3/4] relative overflow-hidden bg-muted"
          data-reader-transition-cover
        >
          {/* Cover Image */}
          {book.cover ? (
            <Image
              src={`/api/books/${book.id}/cover`}
              alt={book.title || "书籍封面"}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
              {/* Book Placeholder */}
              <div className="relative">
                <div className="w-16 h-[5.5rem] sm:w-20 sm:h-28 rounded-r-md rounded-l-sm transform overflow-hidden bg-gradient-to-br from-primary/80 to-primary shadow-md transition-transform duration-300 group-hover:scale-105">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" />
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-r from-black/20 to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl sm:text-3xl font-bold text-white drop-shadow">
                      {book.title?.charAt(0) || "书"}
                    </span>
                  </div>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-white/20 rounded text-[7px] font-medium text-white/90">
                    {book.format?.toUpperCase()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Status Badge */}
          {(hasProgress || isCompleted) && (
            <div className="absolute left-2 top-2">
              <span className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                isCompleted 
                  ? "bg-green-500/90 text-white" 
                  : "bg-primary/90 text-primary-foreground"
              )}>
                {isCompleted ? "已完成" : `${Math.round(progress * 100)}%`}
              </span>
            </div>
          )}
        </div>
      </Link>

      {/* Card Content */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 
              className="truncate text-sm font-medium text-foreground" 
              title={book.title}
            >
              {book.title || "未命名书籍"}
            </h3>
            <p className="truncate text-xs text-muted-foreground mt-0.5">
              {book.author || "未知作者"}
            </p>
            {(lastReadAt || readingDuration > 0) && (
              <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>
                  {lastReadAt ? formatLastRead(lastReadAt) : formatDuration(localDuration || readingDuration)}
                </span>
              </p>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="菜单"
                className="-mr-2 h-7 w-7 shrink-0 rounded-lg opacity-0 transition-all duration-200 group-hover:opacity-100 hover:bg-accent"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href={readerHref} className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  <span>阅读</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => setShowDurationDialog(true)}
              >
                <Clock className="h-4 w-4" />
                <span>设置时长</span>
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

        {/* Progress Bar */}
        {hasProgress && (
          <div className="mt-2">
            <Progress 
              value={progress * 100} 
              className="h-1" 
            />
          </div>
        )}
      </div>

      <SetReadingDurationDialog
        open={showDurationDialog}
        onOpenChange={setShowDurationDialog}
        bookId={book.id}
        bookTitle={book.title || "未知书籍"}
        currentDuration={localDuration}
        onSuccess={(newDuration) => {
          setLocalDuration(newDuration);
          onDurationUpdate?.(book.id, newDuration);
        }}
      />
    </Card>
  );
});
