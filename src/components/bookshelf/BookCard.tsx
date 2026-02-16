"use client";

import Link from "next/link";
import { Book } from "@/lib/db/schema";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { BookOpen, MoreVertical, Trash2, FileText } from "lucide-react";

interface BookCardProps {
  book: Book;
  progress?: number;
  onDelete: (id: string) => void;
}

export function BookCard({ book, progress = 0, onDelete }: BookCardProps) {
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const formatBadgeColor = (format: string) => {
    const colors: Record<string, string> = {
      epub: "bg-blue-500/15 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400",
      pdf: "bg-red-500/15 text-red-600 dark:bg-red-500/20 dark:text-red-400",
      txt: "bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
      mobi: "bg-purple-500/15 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400",
    };
    return colors[format] || "";
  };

  return (
    <Card className="group relative overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-xl hover:-translate-y-1 border-border/50">
      <Link href={`/reader/${book.id}`} className="block">
        <div className="aspect-[3/4] bg-muted relative overflow-hidden">
          {book.cover ? (
            <img
              src={`/api/books/${book.id}/cover`}
              alt={book.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-primary/5 to-secondary/20 transition-all duration-300 group-hover:from-primary/10 group-hover:to-secondary/30">
              <FileText className="h-16 w-16 text-primary/30 transition-all duration-300 group-hover:scale-110 group-hover:text-primary/50" />
              <span className="text-sm text-primary/50 font-medium px-3 text-center line-clamp-2 transition-colors duration-300 group-hover:text-primary/70">
                {book.title}
              </span>
            </div>
          )}

          {/* Format badge */}
          <Badge
            variant="secondary"
            className={`absolute top-3 left-3 text-xs uppercase font-semibold px-2.5 py-1 ${formatBadgeColor(book.format)}`}
          >
            {book.format}
          </Badge>

          {/* Progress overlay */}
          {progress > 0 && (
            <div className="absolute bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm px-3 py-2 border-t border-border/50">
              <div className="flex items-center gap-2">
                <Progress value={progress * 100} className="h-1.5 flex-1" />
                <span className="text-xs font-medium text-foreground">
                  {Math.round(progress * 100)}%
                </span>
              </div>
            </div>
          )}
        </div>
      </Link>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm line-clamp-1 text-foreground" title={book.title}>
              {book.title}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
              {book.author}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatSize(book.fileSize)}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer hover:bg-primary/10"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
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
