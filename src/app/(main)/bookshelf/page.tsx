"use client";

import { useState, useEffect, useCallback } from "react";
import { Clock, CheckCircle2, BookOpen, Library } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { BookGrid } from "@/components/bookshelf/BookGrid";
import { BookCardSkeleton } from "@/components/bookshelf/BookCardSkeleton";
import { SearchBar } from "@/components/bookshelf/SearchBar";
import { UploadDialog } from "@/components/bookshelf/UploadDialog";
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
  const [uploadOpen, setUploadOpen] = useState(false);
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
      <Navbar onUploadClick={() => setUploadOpen(true)} />

      <main className="relative mx-auto w-full max-w-7xl px-4 pb-8 pt-4 sm:px-6 sm:pb-12 sm:pt-5">
        {/* Header Section */}
        <section className="animate-reader-fade-up mb-8 sm:mb-10">
          <div className="surface-glass relative overflow-hidden rounded-[1.5rem] border border-border/50 px-4 py-3.5 shadow-[0_22px_72px_-42px_color-mix(in_oklab,var(--foreground)_24%,transparent)] sm:rounded-[1.75rem] sm:px-7 sm:py-4">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            <div className="absolute -right-20 top-0 h-36 w-36 rounded-full bg-primary/10 blur-3xl dark:bg-primary/15" />
            <div className="absolute bottom-0 left-0 h-24 w-24 rounded-full bg-sky-500/10 blur-3xl dark:bg-sky-400/10" />

            <div className="relative flex flex-col gap-2.5 sm:gap-3 lg:flex lg:items-center lg:justify-center lg:gap-5">

              <div className="order-3 w-full lg:order-none lg:w-full lg:max-w-xl">
                <SearchBar value={search} onChange={setSearch} />
              </div>

              <div className="order-2 grid w-full grid-cols-2 gap-x-2.5 gap-y-2 rounded-2xl border border-border/30 bg-background/30 px-3 py-2 backdrop-blur-sm sm:w-fit sm:grid-cols-4 sm:items-center sm:gap-x-0 sm:gap-y-0 sm:rounded-full lg:order-none">
                <div className="flex min-w-0 items-center gap-1.5 sm:px-2.5">
                  <Library className="h-3.5 w-3.5 text-primary/70" />
                  <span className="text-[11px] text-muted-foreground/70">书籍总数</span>
                  <span className="text-sm font-semibold text-foreground">{stats.total}</span>
                </div>
                <div className="flex min-w-0 items-center gap-1.5 sm:border-l sm:border-border/45 sm:px-2.5">
                  <BookOpen className="h-3.5 w-3.5 text-blue-500/70" />
                  <span className="text-[11px] text-muted-foreground/70">进行中</span>
                  <span className="text-sm font-semibold text-foreground">{stats.reading}</span>
                </div>
                <div className="flex min-w-0 items-center gap-1.5 sm:border-l sm:border-border/45 sm:px-2.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500/70" />
                  <span className="text-[11px] text-muted-foreground/70">已完成</span>
                  <span className="text-sm font-semibold text-foreground">{stats.completed}</span>
                </div>
                <div className="flex min-w-0 items-center gap-1.5 sm:border-l sm:border-border/45 sm:px-2.5">
                  <Clock className="h-3.5 w-3.5 text-amber-500/70" />
                  <span className="text-[11px] text-muted-foreground/70">阅读时长</span>
                  <span className="text-sm font-semibold text-foreground">{stats.duration}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Book Grid */}
        {loading ? (
          <div className="animate-reader-fade-up grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6" style={{ animationDelay: "120ms" }}>
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

      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUploadComplete={() => {
          fetchBooks();
        }}
      />
    </div>
  );
}
