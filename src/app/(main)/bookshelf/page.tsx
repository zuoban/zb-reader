"use client";

import { useState, useEffect, useCallback } from "react";
import { Clock, CheckCircle2, BookOpen, Library } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { BookGrid } from "@/components/bookshelf/BookGrid";
import { BookCardSkeleton } from "@/components/bookshelf/BookCardSkeleton";
import { SearchBar } from "@/components/bookshelf/SearchBar";
import { BackgroundDecoration } from "@/components/bookshelf/BackgroundDecoration";
import { READER_RETURN_SPOTLIGHT_KEY } from "@/components/layout/ReaderRouteTransition";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import type { Book } from "@/lib/db/schema";
import { formatDuration } from "@/lib/utils";

const SKELETON_COUNT = 8;

export default function BookshelfPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [lastReadAtMap, setLastReadAtMap] = useState<Record<string, string>>({});
  const [readingDurationMap, setReadingDurationMap] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [spotlightBookId, setSpotlightBookId] = useState<string | null>(null);
  const { setTheme } = useTheme();

  // Sync theme with reader settings on mount
  useEffect(() => {
    async function syncTheme() {
      try {
        const res = await fetch("/api/reader-settings");
        if (!res.ok) return;
        const data = await res.json();
        const settings = data.settings;
        
        if (settings?.theme) {
          // Map reader theme to next-themes theme
          const globalTheme = settings.theme === "dark" ? "dark" : "light";
          setTheme(globalTheme);
        }
      } catch {
        // ignore
      }
    }
    syncTheme();
  }, [setTheme]);

  const fetchBooks = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set("withProgress", "true");
      if (search) params.set("search", search);

      const res = await fetch(`/api/books?${params}`);
      const data = await res.json();

      if (res.ok) {
        setBooks(data.books);
        setProgressMap(data.progressMap || {});
        setLastReadAtMap(data.lastReadAtMap || {});
        setReadingDurationMap(data.readingDurationMap || {});
      }
    } catch {
      toast.error("获取书籍失败");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBooks();
    }, search ? 300 : 0);

    return () => clearTimeout(timer);
  }, [fetchBooks, search]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const returningBookId = window.sessionStorage.getItem(READER_RETURN_SPOTLIGHT_KEY);
    if (!returningBookId) return;

    setSpotlightBookId(returningBookId);
    window.sessionStorage.removeItem(READER_RETURN_SPOTLIGHT_KEY);

    const timer = window.setTimeout(() => {
      setSpotlightBookId(null);
    }, 1600);

    return () => window.clearTimeout(timer);
  }, [books.length]);

  const handleDelete = useCallback(async (bookId: string) => {
    if (!confirm("确定要删除这本书吗？")) return;

    try {
      const res = await fetch(`/api/books/${bookId}`, { method: "DELETE" });
      if (res.ok) {
        setBooks((prev) => prev.filter((b) => b.id !== bookId));
        toast.success("删除成功");
      } else {
        toast.error("删除失败");
      }
    } catch {
      toast.error("删除失败");
    }
  }, []);

  const handleDurationUpdate = useCallback((bookId: string, newDuration: number) => {
    setReadingDurationMap((prev) => ({
      ...prev,
      [bookId]: newDuration,
    }));
  }, []);

  const stats = {
    total: books.length,
    reading: Object.values(progressMap).filter((v) => v > 0 && v < 1).length,
    completed: Object.values(progressMap).filter((v) => v >= 1).length,
    duration: formatDuration(Object.values(readingDurationMap).reduce((sum, d) => sum + d, 0)),
  };

  return (
    <div className="min-h-screen bg-background">
      <BackgroundDecoration />
      <Navbar onUploadComplete={fetchBooks} />

      <main className="relative mx-auto w-full max-w-7xl px-4 pb-10 pt-4 sm:px-6 sm:pb-14 sm:pt-5">
        {/* Header Section */}
        <section className="animate-reader-fade-up mb-7 space-y-3 sm:mb-8 sm:space-y-4">
          <div className="relative overflow-hidden rounded-[1.25rem] border border-border/60 bg-background/78 px-4 py-3 shadow-[0_16px_36px_-30px_color-mix(in_oklab,var(--foreground)_14%,transparent)] backdrop-blur-xl sm:rounded-[1.4rem] sm:px-5 sm:py-3.5">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />

            <div className="relative">
              <div className="w-full lg:max-w-xl">
                <SearchBar value={search} onChange={setSearch} />
              </div>
            </div>
          </div>

          <div className="rounded-[1.1rem] border border-border/55 bg-background/88 px-3 py-2.5 shadow-[0_12px_28px_-26px_color-mix(in_oklab,var(--foreground)_12%,transparent)] sm:px-4">
            <div className="grid grid-cols-2 gap-y-2 sm:grid-cols-4 sm:gap-y-0">
              <div className="flex min-w-0 items-center gap-2 px-1.5 sm:px-3">
                <Library className="h-3.5 w-3.5 shrink-0 text-primary/75" />
                <span className="text-[11px] text-muted-foreground">书籍总数</span>
                <span className="text-base font-semibold tracking-[-0.03em] text-foreground">{stats.total}</span>
              </div>
              <div className="flex min-w-0 items-center gap-2 px-1.5 sm:border-l sm:border-border/50 sm:px-3">
                <BookOpen className="h-3.5 w-3.5 shrink-0 text-blue-500/75" />
                <span className="text-[11px] text-muted-foreground">进行中</span>
                <span className="text-base font-semibold tracking-[-0.03em] text-foreground">{stats.reading}</span>
              </div>
              <div className="flex min-w-0 items-center gap-2 px-1.5 sm:border-l sm:border-border/50 sm:px-3">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500/75" />
                <span className="text-[11px] text-muted-foreground">已完成</span>
                <span className="text-base font-semibold tracking-[-0.03em] text-foreground">{stats.completed}</span>
              </div>
              <div className="flex min-w-0 items-center gap-2 px-1.5 sm:border-l sm:border-border/50 sm:px-3">
                <Clock className="h-3.5 w-3.5 shrink-0 text-amber-500/80" />
                <span className="text-[11px] text-muted-foreground">阅读时长</span>
                <span className="truncate text-base font-semibold tracking-[-0.03em] text-foreground">{stats.duration}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Book Grid */}
        {loading ? (
          <div className="animate-reader-fade-up grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-3.5 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6" style={{ animationDelay: "120ms" }}>
            {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <BookCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <BookGrid
            books={books}
            progressMap={progressMap}
            lastReadAtMap={lastReadAtMap}
            readingDurationMap={readingDurationMap}
            spotlightBookId={spotlightBookId}
            onDelete={handleDelete}
            onDurationUpdate={handleDurationUpdate}
          />
        )}
      </main>
    </div>
  );
}
