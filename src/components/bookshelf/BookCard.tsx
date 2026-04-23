"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { memo, useEffect, useRef } from "react";
import { BookOpen, MoreVertical, Tags, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  const lastReadText = lastReadAt ? formatLastRead(lastReadAt) : null;
  const statusText = isCompleted ? "已完成" : hasProgress ? `${Math.round(progress * 100)}%` : "未开始";

  return (
    <Card
      ref={cardRef}
      className={cn(
        "book-card-glass group relative overflow-hidden rounded-2xl py-0 transition-all duration-300 ease-out",
        "hover:-translate-y-0.5 hover:border-ring/35 hover:shadow-[0_26px_58px_-40px_color-mix(in_oklab,var(--foreground)_48%,transparent)]",
        spotlight && "animate-pulse-subtle ring-2 ring-primary/28"
      )}
    >
      <div className="liquid-hairline absolute inset-x-3 top-0 z-10 h-px opacity-70 transition-opacity duration-300 group-hover:opacity-100" />
      <Link
        href={readerHref}
        className={cn("block cursor-pointer", spotlight && "animate-reader-fade-up")}
        onMouseEnter={handleMouseEnter}
        onClick={handleOpenReader}
      >
        <div
          className="relative m-1.5 aspect-[5/7] overflow-hidden rounded-xl bg-muted/70 shadow-[inset_0_1px_0_color-mix(in_oklab,white_42%,transparent),inset_0_-1px_0_color-mix(in_oklab,var(--foreground)_8%,transparent)]"
          data-reader-transition-cover
        >
          {/* Cover Image */}
          {book.cover ? (
            <>
              <Image
                src={`/api/books/${book.id}/cover`}
                alt={book.title || "书籍封面"}
                fill
                unoptimized
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.018]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/28 via-black/4 to-transparent opacity-65 transition-opacity duration-300 group-hover:opacity-78" />
              <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-white/18 to-transparent opacity-75" />
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(145deg,color-mix(in_oklab,var(--muted)_76%,white_24%),color-mix(in_oklab,var(--accent)_68%,var(--cta)_8%))] dark:bg-muted/20">
              <div className="relative">
                <div className="flex h-[4.35rem] w-[3.25rem] items-center justify-center overflow-hidden rounded-r-lg rounded-l-sm border border-white/18 bg-gradient-to-b from-foreground/90 to-foreground/70 text-white shadow-[0_14px_28px_-20px_color-mix(in_oklab,var(--foreground)_50%,transparent)] transition-transform duration-500 ease-out group-hover:scale-[1.018] sm:h-[4.8rem] sm:w-[3.55rem]">
                  <div className="absolute inset-y-0 left-0 w-1 bg-black/16" />
                  <div className="absolute inset-x-0 top-0 h-px bg-white/48" />
                  <span className="text-lg font-semibold text-white/92 sm:text-xl">
                    {book.title?.charAt(0) || "书"}
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>
      </Link>

      {/* Card Content */}
      <div className="flex min-h-[56px] flex-col px-3 pb-3 pt-1 sm:min-h-[58px]">
        <div className="flex items-start justify-between gap-1.5">
          <div className="min-w-0 flex-1">
            <h3
              className="line-clamp-1 text-[12px] font-semibold text-foreground/95 sm:text-[13px]"
              title={book.title}
            >
              {book.title || "未命名书籍"}
            </h3>
            <div className="mt-0.5 line-clamp-1 text-[9px] text-muted-foreground/82 sm:text-[10px]">
              {book.author || "未知作者"}
            </div>
            {book.category ? (
              <Badge
                variant="outline"
                className="mt-1 max-w-full rounded-lg border-border/45 bg-background/28 px-1.5 py-0.5 text-[8px] font-medium leading-none text-muted-foreground/82 shadow-[0_1px_0_color-mix(in_oklab,white_34%,transparent)_inset] sm:text-[9px]"
                title={book.category}
              >
                <Tags className="h-2.5 w-2.5 text-muted-foreground/58" />
                <span className="truncate">{book.category}</span>
              </Badge>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="菜单"
                  className="liquid-control -mr-1 h-6 w-6 shrink-0 rounded-lg text-muted-foreground/70 opacity-100 transition-all duration-200 hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100"
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
                {onChangeCategory ? (
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => onChangeCategory(book)}
                  >
                    <Tags className="h-4 w-4" />
                    <span>设置分类</span>
                  </DropdownMenuItem>
                ) : null}
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

        <div className="mt-1.5 flex items-center justify-between gap-1.5">
          <span className="min-w-0 truncate text-[8px] font-medium text-muted-foreground/72 sm:text-[9px]">
            {statusText}
          </span>
          {lastReadText ? (
            <div className="shrink-0 text-[8px] text-muted-foreground/72 sm:text-[9px]">
              {lastReadText}
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
});
