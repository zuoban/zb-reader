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
import { formatBytes } from "@/lib/book-cache";

interface BookCardProps {
  book: Book;
  progress?: number;
  lastReadAt?: string;
  onDelete: (id: string) => void;
}

export function BookCard({ book, progress = 0, lastReadAt, onDelete }: BookCardProps) {
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
              alt={book.title || "书籍封面"}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full relative overflow-hidden">
              {/* 背景纹理 */}
              <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-slate-50 to-zinc-100 dark:from-slate-900/80 dark:via-slate-800/60 dark:to-zinc-900/80" />
              <div className="absolute inset-0 opacity-40" style={{
                backgroundImage: `radial-gradient(circle at 20% 80%, rgba(99,102,241,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(236,72,153,0.08) 0%, transparent 50%), radial-gradient(circle at 40% 40%, rgba(34,211,238,0.05) 0%, transparent 40%)`
              }} />
              
              {/* 几何装饰 */}
              <div className="absolute top-4 right-4 w-16 h-16 rounded-full border border-indigo-200/30 dark:border-indigo-500/20" />
              <div className="absolute bottom-8 left-4 w-8 h-8 rounded-full bg-gradient-to-br from-pink-200/20 to-purple-200/20 dark:from-pink-500/10 dark:to-purple-500/10" />
              <div className="absolute top-1/3 left-8 w-2 h-16 rounded-full bg-gradient-to-b from-indigo-200/30 to-transparent dark:from-indigo-500/20" />
              
              {/* 书本主体 */}
              <div className="absolute inset-0 flex items-center justify-center p-6">
                <div className="relative">
                  {/* 书本阴影 */}
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-28 h-4 bg-gradient-to-r from-transparent via-slate-400/20 to-transparent blur-sm rounded-full" />
                  
                  {/* 书本封面 */}
                  <div className="relative w-[4.5rem] h-[6.5rem] sm:w-24 sm:h-[8.5rem] rounded-r-md rounded-l-sm shadow-xl transform transition-all duration-300 group-hover:scale-105 group-hover:-translate-y-1 group-hover:shadow-2xl overflow-hidden">
                    {/* 封面渐变 */}
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 dark:from-indigo-600 dark:via-purple-600 dark:to-pink-600" />
                    
                    {/* 封面纹理 */}
                    <div className="absolute inset-0 opacity-30" style={{
                      backgroundImage: `linear-gradient(135deg, rgba(255,255,255,0.1) 25%, transparent 25%), linear-gradient(225deg, rgba(255,255,255,0.1) 25%, transparent 25%), linear-gradient(45deg, rgba(255,255,255,0.1) 25%, transparent 25%), linear-gradient(315deg, rgba(255,255,255,0.1) 25%, transparent 25%)`,
                      backgroundSize: '12px 12px',
                      backgroundPosition: '0 0, 6px 0, 6px -6px, 0 6px'
                    }} />
                    
                    {/* 高光 */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-transparent" />
                    <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-white/10 to-transparent" />
                    
                    {/* 书脊 */}
                    <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-r from-black/20 via-transparent to-transparent" />
                    <div className="absolute left-1 top-0 bottom-0 w-px bg-white/20" />
                    
                    {/* 装饰线条 */}
                    <div className="absolute top-3 left-3 right-3 h-px bg-white/20" />
                    <div className="absolute bottom-3 left-3 right-3 h-px bg-white/20" />
                    
                    {/* 书名首字母 */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="relative">
                        <span className="relative z-10 text-4xl sm:text-5xl font-black text-white/95 drop-shadow-lg tracking-tight" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
                          {book.title?.charAt(0) || "书"}
                        </span>
                        {/* 字母光晕 */}
                        <div className="absolute inset-0 blur-lg bg-white/30 -z-10 scale-150" />
                      </div>
                    </div>
                    
                    {/* 底部装饰标签 */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-white/15 backdrop-blur-sm rounded text-[8px] sm:text-[10px] font-medium text-white/80 tracking-wider">
                      {book.format?.toUpperCase() || "BOOK"}
                    </div>
                  </div>
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
                  {(progress * 100).toFixed(2)}%
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
              {formatBytes(book.fileSize)}
            </p>
          </div>

            <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="菜单"
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
