"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { memo, useEffect, useRef } from "react";
import { BookOpen, Check, MoreVertical, Tags, Trash2 } from "lucide-react";
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
  const hasPrefetchedRef = useRef(false);

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
        "book-card-glass group relative gap-3 overflow-hidden rounded-[1.25rem] border-white/20 py-0 transition-all duration-400 ease-out sm:rounded-[1.5rem]",
        spotlight && "ring-2 ring-primary/28"
      )}
    >
      <div className="liquid-hairline absolute inset-x-3 top-0 z-10 h-px opacity-60 transition-opacity duration-400 group-hover:opacity-100" />
      <Link
        href={readerHref}
        className={cn("block cursor-pointer", spotlight && "animate-reader-fade-up")}
        onMouseEnter={handleMouseEnter}
        onClick={handleOpenReader}
      >
        <div
          className="liquid-control relative mx-1.5 mt-1.5 mb-1 aspect-[4/5] overflow-hidden rounded-[1rem] p-0 shadow-md"
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
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.08]"
              />
              
              {/* Book spine & page edge effect */}
              <div className="absolute inset-y-0 left-0 w-[4%] bg-black/24 backdrop-blur-[1px]" />
              <div className="absolute inset-y-0 left-[4%] w-px bg-white/12" />
              <div className="absolute inset-0 bg-gradient-to-tr from-black/45 via-transparent to-white/10 opacity-60" />
              <div className="absolute inset-0 ring-1 ring-inset ring-black/5" />
              
              {/* Visual Progress Bar Overlay */}
              {hasProgress && (
                <div className="absolute inset-x-3 bottom-2.5 z-20 h-1.5 rounded-full bg-black/32 p-0.5 backdrop-blur-md">
                  <div 
                    className="h-full rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] transition-all duration-500" 
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
              )}
              
              {isCompleted && (
                <div className="absolute top-2 right-2 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-[color:var(--chart-3)] shadow-lg backdrop-blur-sm">
                  <Check className="h-3.5 w-3.5 stroke-[3px]" />
                </div>
              )}
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(145deg,color-mix(in_oklab,var(--glass-strong)_72%,white_28%),color-mix(in_oklab,var(--accent)_62%,var(--cta)_12%))]">
              <div className="relative">
                <div className="liquid-control flex h-[4.35rem] w-[3.25rem] items-center justify-center overflow-hidden rounded-r-lg rounded-l-sm text-foreground transition-transform duration-700 ease-out group-hover:scale-[1.05] sm:h-[4.8rem] sm:w-[3.55rem]">
                  <div className="absolute inset-y-0 left-0 w-1.5 bg-black/15" />
                  <div className="liquid-hairline absolute inset-x-0 top-0 h-px opacity-40" />
                  <span className="text-lg font-bold tracking-tighter sm:text-xl">
                    {book.title?.charAt(0) || "书"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </Link>

      {/* Card Content */}
      <div className="relative flex min-h-[62px] flex-col px-3.5 pb-3.5 pt-1.5 sm:min-h-[68px]">
        <div className="flex items-start justify-between gap-1.5">
          <h3
            className="line-clamp-2 min-h-[2.5em] flex-1 text-[13.5px] font-bold leading-[1.3] tracking-tight text-foreground/90 transition-colors duration-300 group-hover:text-foreground sm:text-[14.5px]"
            title={book.title}
          >
            {book.title || "未命名书籍"}
          </h3>

          <div className="relative -mr-1.5 flex shrink-0 flex-col items-end pt-0.5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="菜单"
                  className="liquid-control h-7 w-7 shrink-0 rounded-lg text-muted-foreground/50 opacity-100 transition-all duration-300 hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 animate-in fade-in-0 zoom-in-95 duration-200">
                <DropdownMenuItem asChild className="cursor-pointer py-2.5">
                  <Link href={readerHref} className="flex items-center gap-2.5">
                    <BookOpen className="h-4 w-4 text-[color:var(--cta)]" />
                    <span className="font-semibold text-sm">开始阅读</span>
                  </Link>
                </DropdownMenuItem>
                {onChangeCategory ? (
                  <DropdownMenuItem
                    className="cursor-pointer py-2.5"
                    onClick={() => onChangeCategory(book)}
                  >
                    <Tags className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold text-sm">设置分类</span>
                  </DropdownMenuItem>
                ) : null}
                <div className="my-1.5 h-px bg-border/40" />
                <DropdownMenuItem
                  className="cursor-pointer py-2.5 text-destructive focus:bg-destructive/10 focus:text-destructive"
                  onClick={() => onDelete(book.id)}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="font-semibold text-sm">删除书籍</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="mt-2 flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="min-w-0 truncate text-left text-[10px] font-semibold text-muted-foreground/75 transition-colors duration-300 group-hover:text-muted-foreground sm:text-[11px]">
              {book.author || "未知作者"}
            </span>
            {book.category ? (
              <Badge
                variant="secondary"
                className="max-w-[45%] shrink-0 rounded-md border-transparent bg-foreground/[0.04] px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground/80 transition-all duration-300 group-hover:bg-foreground/[0.08] group-hover:text-foreground sm:text-[10px]"
                title={book.category}
              >
                {book.category}
              </Badge>
            ) : null}
          </div>
          
          <div className="flex items-center justify-between gap-2 border-t border-border/15 pt-2.5">
            <div className="flex items-center gap-2">
              <div className={cn(
                "flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold tracking-tight sm:text-[10px]",
                isCompleted 
                  ? "bg-[color:var(--chart-3)]/10 text-[color:var(--chart-3)]" 
                  : hasProgress 
                    ? "bg-[color:var(--cta)]/10 text-[color:var(--cta)]"
                    : "bg-foreground/5 text-foreground/60"
              )}>
                {isCompleted && <Check className="h-2.5 w-2.5 stroke-[3px]" />}
                {statusText}
              </div>
            </div>
            {lastReadText ? (
              <span className="shrink-0 text-[9px] font-medium text-muted-foreground/60 sm:text-[10px]">
                {lastReadText}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  );
});
