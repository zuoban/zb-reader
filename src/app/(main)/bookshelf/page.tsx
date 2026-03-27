"use client";

import { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { BookGrid } from "@/components/bookshelf/BookGrid";
import { BookCardSkeleton } from "@/components/bookshelf/BookCardSkeleton";
import { SearchBar } from "@/components/bookshelf/SearchBar";
import { UploadDialog } from "@/components/bookshelf/UploadDialog";
import { READER_RETURN_SPOTLIGHT_KEY } from "@/components/layout/ReaderRouteTransition";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import type { Book } from "@/lib/db/schema";
import { formatDuration } from "@/lib/utils";
import { Library, Clock, CheckCircle2, BookOpen } from "lucide-react";

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
      <Navbar onUploadClick={() => setUploadOpen(true)} />

      <main className="mx-auto w-full max-w-7xl px-4 pb-8 pt-4 sm:px-6 sm:pb-12 sm:pt-6">
        {/* Header Section */}
        <section className="animate-reader-fade-up mb-8 sm:mb-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                我的书架
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {stats.total > 0 ? `共 ${stats.total} 本书，继续今天的阅读` : "开始你的阅读之旅"}
              </p>
            </div>
            <div className="w-full sm:w-auto">
              <SearchBar value={search} onChange={setSearch} />
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="animate-reader-fade-up mb-8 sm:mb-10" style={{ animationDelay: "80ms" }}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {/* Total Books */}
            <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/50 px-4 py-3 transition-colors hover:border-border/80">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Library className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">书籍总数</p>
                <p className="text-lg font-semibold text-foreground">{stats.total}</p>
              </div>
            </div>

            {/* Reading */}
            <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/50 px-4 py-3 transition-colors hover:border-border/80">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">阅读中</p>
                <p className="text-lg font-semibold text-foreground">{stats.reading}</p>
              </div>
            </div>

            {/* Completed */}
            <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/50 px-4 py-3 transition-colors hover:border-border/80">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-500/10 text-green-500">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">已完成</p>
                <p className="text-lg font-semibold text-foreground">{stats.completed}</p>
              </div>
            </div>

            {/* Duration */}
            <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/50 px-4 py-3 transition-colors hover:border-border/80">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">总时长</p>
                <p className="text-lg font-semibold text-foreground">{stats.duration}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Book Grid */}
        {loading ? (
          <div className="animate-reader-fade-up grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6" style={{ animationDelay: "120ms" }}>
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
