"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { memo, useEffect, useRef, useState } from "react";
import { BookOpen, MoreVertical, Trash2, Clock, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { READER_ROUTE_TRANSITION_EVENT } from "@/components/layout/ReaderRouteTransition";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/utils";
import { SetReadingDurationDialog } from "./SetReadingDurationDialog";
import type { MouseEvent as ReactMouseEvent } from "react";
import type { Book } from "@/lib/db/schema";

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
  const durationText = localDuration > 0 || readingDuration > 0
    ? formatDuration(localDuration || readingDuration)
    : null;
  const lastReadText = lastReadAt ? formatLastRead(lastReadAt) : null;
  const statusText = isCompleted ? "已完成" : hasProgress ? `${Math.round(progress * 100)}%` : null;

  return (
    <Card
      ref={cardRef}
      className={cn(
        "group surface-glass relative overflow-hidden rounded-[1.15rem] border border-border/50 bg-card/80 transition-all duration-300 sm:rounded-[1.5rem]",
        "hover:-translate-y-1 hover:border-border/70 hover:shadow-[0_22px_52px_-38px_color-mix(in_oklab,var(--foreground)_24%,transparent)]",
        "active:translate-y-0 active:scale-[0.995]",
        spotlight && "animate-pulse-subtle ring-2 ring-primary/30"
      )}
    >
      <div className="absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-foreground/12 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <Link
        href={readerHref}
        className={cn("block cursor-pointer", spotlight && "animate-reader-fade-up")}
        onMouseEnter={handleMouseEnter}
        onClick={handleOpenReader}
      >
        <div
          className="relative aspect-[3/4] overflow-hidden bg-muted"
          data-reader-transition-cover
        >
          {/* Cover Image */}
          {book.cover ? (
            <>
              <Image
                src={`/api/books/${book.id}/cover`}
                alt={book.title || "书籍封面"}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/36 via-transparent to-white/10 opacity-75" />
              <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/12 to-transparent" />
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted/80 to-muted/45 dark:from-muted/40 dark:to-muted/20">
              <div className="relative">
                <div className="flex h-[5.75rem] w-[4.25rem] items-center justify-center overflow-hidden rounded-r-lg rounded-l-sm border border-white/10 bg-gradient-to-b from-foreground/80 to-foreground/65 text-white shadow-[0_18px_24px_-18px_rgba(15,23,42,0.4)] transition-transform duration-500 group-hover:scale-[1.03] sm:h-28 sm:w-[4.9rem]">
                  <div className="absolute inset-y-0 left-0 w-1.5 bg-black/15" />
                  <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-white/10 to-transparent" />
                  <span className="text-xl font-semibold tracking-[-0.04em] text-white/92 sm:text-2xl">
                    {book.title?.charAt(0) || "书"}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="absolute inset-x-2 bottom-2 flex items-end justify-start sm:inset-x-2.5 sm:bottom-2.5">
            <span className="rounded-full border border-white/15 bg-black/30 px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-[0.12em] text-white/90 backdrop-blur-sm sm:px-2 sm:text-[9px] sm:tracking-[0.14em]">
              {book.format?.toUpperCase() || "BOOK"}
            </span>
          </div>
        </div>
      </Link>

      {/* Card Content */}
      <div className="p-3 sm:p-3.5">
        <div className="flex items-start justify-between gap-1.5">
          <div className="min-w-0 flex-1">
            <h3
              className="line-clamp-1 text-[13px] font-semibold tracking-[-0.02em] text-foreground sm:text-sm"
              title={book.title}
            >
              {book.title || "未命名书籍"}
            </h3>
            <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground/90 sm:text-[11px]">
              {book.author || "未知作者"}
            </p>
            {(durationText || lastReadText || statusText) && (
              <div className="mt-1 flex min-h-4 items-center gap-1.5 text-[9px] text-muted-foreground sm:mt-1.5 sm:text-[10px]">
                {durationText && (
                  <span className="flex min-w-0 items-center gap-1">
                    <Clock className="h-2.5 w-2.5 shrink-0" />
                    <span className="truncate">{durationText}</span>
                  </span>
                )}
                {durationText && lastReadText && <span className="h-1 w-1 rounded-full bg-border/80" />}
                {lastReadText && <span className="truncate">{lastReadText}</span>}
                {(durationText || lastReadText) && statusText && <span className="h-1 w-1 rounded-full bg-border/80" />}
                {statusText && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 font-medium",
                      isCompleted ? "text-green-600 dark:text-green-400" : "text-primary"
                    )}
                  >
                    {isCompleted && <CheckCircle2 className="h-3 w-3" />}
                    <span>{statusText}</span>
                  </span>
                )}
              </div>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="菜单"
                className="-mr-1 h-6.5 w-6.5 shrink-0 rounded-md text-muted-foreground/70 opacity-70 transition-all duration-200 hover:bg-accent/70 hover:text-foreground sm:h-7 sm:w-7 sm:rounded-lg sm:opacity-0 sm:group-hover:opacity-100"
              >
                <MoreVertical className="h-3 w-3" />
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
