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
    <div className="app-noise min-h-screen bg-background">
      <BackgroundDecoration />
      <Navbar onUploadComplete={fetchBooks} />

      <main className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-10 pt-4 sm:px-6 sm:pb-14 sm:pt-5">
        {/* Header Section */}
        <section className="animate-reader-fade-up mb-7 space-y-3 sm:mb-8 sm:space-y-4">
          <div className="relative overflow-hidden rounded-2xl border border-border/65 bg-card/76 px-4 py-4 shadow-[0_24px_58px_-42px_color-mix(in_oklab,var(--foreground)_38%,transparent)] backdrop-blur-2xl sm:px-5 lg:px-6">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent dark:via-white/12" />
            <div className="absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-border/80 to-transparent" />

            <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/60 px-3 py-1 text-[11px] font-medium text-muted-foreground">
                  <Library className="h-3.5 w-3.5 text-[color:var(--cta)]" />
                  <span>私人 EPUB 阅读库</span>
                </div>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  我的书架
                </h1>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  管理收藏、同步进度，继续打开上次停下的章节。
                </p>
              </div>

              <div className="w-full lg:max-w-xl">
                <SearchBar value={search} onChange={setSearch} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/72 px-3 py-3 shadow-[0_18px_44px_-38px_color-mix(in_oklab,var(--foreground)_28%,transparent)] backdrop-blur-xl sm:px-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="flex min-w-0 items-center gap-2 rounded-xl bg-background/48 px-3 py-2 ring-1 ring-border/45">
                <Library className="h-3.5 w-3.5 shrink-0 text-foreground/75" />
                <span className="text-[11px] text-muted-foreground">书籍总数</span>
                <span className="text-base font-semibold tracking-[-0.03em] text-foreground">{stats.total}</span>
              </div>
              <div className="flex min-w-0 items-center gap-2 rounded-xl bg-background/48 px-3 py-2 ring-1 ring-border/45">
                <BookOpen className="h-3.5 w-3.5 shrink-0 text-teal-700/80 dark:text-teal-300/80" />
                <span className="text-[11px] text-muted-foreground">进行中</span>
                <span className="text-base font-semibold tracking-[-0.03em] text-foreground">{stats.reading}</span>
              </div>
              <div className="flex min-w-0 items-center gap-2 rounded-xl bg-background/48 px-3 py-2 ring-1 ring-border/45">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-700/75 dark:text-emerald-300/75" />
                <span className="text-[11px] text-muted-foreground">已完成</span>
                <span className="text-base font-semibold tracking-[-0.03em] text-foreground">{stats.completed}</span>
              </div>
              <div className="flex min-w-0 items-center gap-2 rounded-xl bg-background/48 px-3 py-2 ring-1 ring-border/45">
                <Clock className="h-3.5 w-3.5 shrink-0 text-[color:var(--cta)]" />
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
