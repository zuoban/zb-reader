"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo, useEffect, useRef, useState } from "react";
import { BookOpen, Check, MoreVertical, Tags, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookCoverImage } from "@/components/ui/book-cover-image";
import { READER_ROUTE_TRANSITION_EVENT } from "@/components/layout/ReaderRouteTransition";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
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
  spotlight?: boolean;
  onDelete: (id: string) => void;
  onChangeCategory?: (book: Book) => void;
}

export const BookCard = memo(function BookCard({
  book,
  progress = 0,
  lastReadAt,
  spotlight = false,
  onDelete,
  onChangeCategory,
}: BookCardProps) {
  const router = useRouter();
  const readerHref = `/reader/${book.id}`;
  const cardRef = useRef<HTMLDivElement>(null);
  const hasPrefetchedRef = useRef(false);
  const [coverError, setCoverError] = useState(false);

  const handleMouseEnter = () => {
    if (hasPrefetchedRef.current) return;
    hasPrefetchedRef.current = true;
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
              coverUrl: book.cover ? `/api/books/${book.id}/cover?w=400` : undefined,
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
  const lastReadText = lastReadAt ? formatLastRead(lastReadAt) : null;
  // statusText 用于显示阅读状态，目前通过进度条展示，保留以备将来使用
  void (isCompleted ? "已完成" : hasProgress ? `${Math.round(progress * 100)}%` : "未开始");

  return (
    <Card
      ref={cardRef}
      className={cn(
        "book-card-glass group relative overflow-hidden rounded-2xl p-0",
        spotlight && "ring-2 ring-primary/30"
      )}
    >
      <Link
        href={readerHref}
        className={cn("block cursor-pointer", spotlight && "animate-fade-in")}
        onMouseEnter={handleMouseEnter}
        onClick={handleOpenReader}
      >
        <div
          className="relative m-1 aspect-[3/4] overflow-hidden rounded-xl bg-muted shadow-sm"
          data-reader-transition-cover
        >
          {/* Cover Image */}
          {book.cover && !coverError ? (
            <>
              <BookCoverImage
                bookId={book.id}
                alt={book.title || "书籍封面"}
                className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                onError={() => setCoverError(true)}
              />
              
              {/* Subtle Book spine effect */}
              <div className="absolute inset-y-0 left-0 w-[3%] bg-black/5" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/10 via-transparent to-transparent opacity-40" />
              
              {/* Category Badge Overlay */}
              {book.category && (
                <div className="absolute left-2 top-2 z-20">
                  <div className="inline-flex items-center rounded-sm bg-black/60 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-white backdrop-blur-md">
                    {book.category}
                  </div>
                </div>
              )}

              {isCompleted && (
                <div className="absolute top-2 right-2 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                  <Check className="h-3.5 w-3.5 stroke-[3px]" />
                </div>
              )}
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted/50">
              <div className="relative flex h-24 w-16 items-center justify-center rounded-sm border border-border/50 bg-background/50 shadow-sm transition-transform duration-500 group-hover:scale-105">
                <div className="absolute inset-y-0 left-0 w-1 bg-primary/5" />
                <span className="font-heading text-xl font-bold italic opacity-40">
                  {book.title?.charAt(0) || "B"}
                </span>
              </div>
              
              {book.category && (
                <div className="absolute left-2 top-2 z-20">
                  <div className="inline-flex items-center rounded-sm bg-black/60 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-white backdrop-blur-md">
                    {book.category}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </Link>

      {/* Card Content */}
      <div className="relative flex flex-col px-3 pb-3 pt-2">
        <div className="flex items-start justify-between gap-1">
          <Link href={readerHref} onClick={handleOpenReader} className="flex-1 min-w-0">
            <h3
              className="line-clamp-1 font-heading text-[14px] font-bold leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary sm:text-[15px]"
              title={book.title}
            >
              {book.title || "未命名书籍"}
            </h3>
            <p className="mt-0.5 line-clamp-1 text-[11px] font-medium text-muted-foreground/70 sm:text-[12px]">
              {book.author || "未知作者"}
            </p>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full text-muted-foreground/40 hover:bg-muted hover:text-foreground shrink-0"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 rounded-xl shadow-xl">
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href={readerHref} className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  <span className="font-medium">开始阅读</span>
                </Link>
              </DropdownMenuItem>
              {onChangeCategory && (
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => onChangeCategory(book)}
                >
                  <Tags className="h-4 w-4" />
                  <span className="font-medium">分类管理</span>
                </DropdownMenuItem>
              )}
              <div className="my-1 h-px bg-border/50" />
              <DropdownMenuItem
                className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
                onClick={() => onDelete(book.id)}
              >
                <Trash2 className="h-4 w-4" />
                <span className="font-medium">移除书籍</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2.5 px-0.5">
          <div className="flex items-center gap-1.5">
            {isCompleted ? (
              <span className="text-[9px] font-extrabold tracking-wider text-primary uppercase">
                COMPLETED
              </span>
            ) : hasProgress ? (
              <span className="text-[9px] font-extrabold tracking-wider text-foreground/80 uppercase">
                <span className="text-foreground">{Math.round(progress * 100)}%</span> READ
              </span>
            ) : (
              <span className="text-[9px] font-extrabold tracking-wider text-muted-foreground/60 uppercase">
                NEW
              </span>
            )}
          </div>
          {lastReadText && (
            <span className="text-[9px] font-bold text-muted-foreground/50 italic">
              {lastReadText}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
});
