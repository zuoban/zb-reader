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
  const statusText = isCompleted ? "已完成" : hasProgress ? `${Math.round(progress * 100)}%` : "未开始";

  return (
    <Card
      ref={cardRef}
      className={cn(
        "group relative overflow-hidden rounded-[0.85rem] border border-border/60 bg-card/96 transition-all duration-300 sm:rounded-[0.95rem]",
        "hover:border-border/75 hover:shadow-[0_14px_28px_-26px_color-mix(in_oklab,var(--foreground)_12%,transparent)]",
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
          className="relative aspect-[5/7] overflow-hidden bg-muted"
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
                className="object-cover transition-transform duration-500 group-hover:scale-[1.015]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-65" />
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted/55 dark:bg-muted/20">
              <div className="relative">
                <div className="flex h-[4.35rem] w-[3.25rem] items-center justify-center overflow-hidden rounded-r-lg rounded-l-sm border border-black/5 bg-gradient-to-b from-foreground/78 to-foreground/68 text-white shadow-[0_12px_20px_-18px_rgba(15,23,42,0.26)] transition-transform duration-500 group-hover:scale-[1.01] sm:h-[4.8rem] sm:w-[3.55rem]">
                  <div className="absolute inset-y-0 left-0 w-1.5 bg-black/12" />
                  <span className="text-lg font-semibold tracking-[-0.04em] text-white/92 sm:text-xl">
                    {book.title?.charAt(0) || "书"}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/26 via-black/8 to-transparent px-2 py-2 sm:px-2.5 sm:py-2.5">
            <span className="rounded-full border border-white/12 bg-black/20 px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-[0.12em] text-white/82 backdrop-blur-sm sm:text-[9px] sm:tracking-[0.14em]">
              {book.format?.toUpperCase() || "BOOK"}
            </span>
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[8px] font-medium backdrop-blur-sm sm:text-[9px]",
                isCompleted
                  ? "border-green-400/16 bg-green-500/16 text-white/94"
                  : hasProgress
                    ? "border-primary/18 bg-primary/18 text-white/94"
                    : "border-white/12 bg-black/20 text-white/84"
              )}
            >
              {isCompleted ? <CheckCircle2 className="h-2.5 w-2.5" /> : null}
              <span>{statusText}</span>
            </span>
          </div>

        </div>
      </Link>

      {/* Card Content */}
      <div className="flex flex-col px-2 pb-1.5 pt-1">
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0 flex-1">
            <h3
              className="line-clamp-1 text-[11px] font-semibold tracking-[-0.025em] text-foreground sm:text-[12px]"
              title={book.title}
            >
              {book.title || "未命名书籍"}
            </h3>
            <div className="mt-0.5 line-clamp-1 text-[9px] text-muted-foreground sm:text-[10px]">
              {book.author || "未知作者"}
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="菜单"
                  className="-mr-1 h-5.5 w-5.5 shrink-0 rounded-md text-muted-foreground/70 opacity-100 transition-all duration-200 hover:bg-accent/70 hover:text-foreground sm:rounded-lg sm:opacity-45 sm:group-hover:opacity-100"
                >
                  <MoreVertical className="h-2.5 w-2.5" />
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
        </div>

        {durationText || lastReadText ? (
          <div className="mt-1 flex items-center justify-between">
            {durationText ? (
              <div className="inline-flex items-center gap-1 text-[8px] text-muted-foreground/88 sm:text-[9px]">
                <Clock className="h-2.5 w-2.5 shrink-0" />
                <span>{durationText}</span>
              </div>
            ) : <div />}
            {lastReadText ? (
              <div className="text-[8px] text-muted-foreground/88 sm:text-[9px]">
                {lastReadText}
              </div>
            ) : null}
          </div>
        ) : null}
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
