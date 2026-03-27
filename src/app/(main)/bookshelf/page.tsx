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

  return (
    <div className="min-h-screen">
      <Navbar onUploadClick={() => setUploadOpen(true)} />

      <main className="mx-auto w-full max-w-7xl px-3 pb-8 pt-5 sm:px-4 sm:pb-10 sm:pt-7">
        <section
          className="section-shell animate-reader-fade-up relative mb-6 overflow-hidden p-4 sm:mb-8 sm:p-6"
          style={{
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--card) 88%, white 12%) 0%, color-mix(in srgb, var(--card) 96%, transparent) 100%)",
            boxShadow:
              "0 24px 60px -42px color-mix(in srgb, var(--foreground) 22%, transparent)",
          }}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(255,255,255,0.14),transparent)]" />
          <div className="pointer-events-none absolute right-[-6rem] top-[-5rem] h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.12)_0%,transparent_70%)] blur-3xl" />
          <div className="pointer-events-none absolute left-[-6rem] bottom-[-8rem] h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(23,23,23,0.08)_0%,transparent_72%)] blur-3xl" />
          <div className="flex flex-col gap-4">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground">
                  READING HUB
                </p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">我的书架</h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {books.length > 0 ? `共 ${books.length} 本书，继续今天的阅读。` : "开始你的阅读之旅"}
                </p>
              </div>
              <div className="w-full sm:w-auto">
                <SearchBar value={search} onChange={setSearch} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(255,255,255,0.48))] px-3 py-3 shadow-[0_16px_34px_-28px_rgba(0,0,0,0.24)] backdrop-blur-md">
                <p className="text-[11px] tracking-[0.14em] text-muted-foreground">书籍总数</p>
                <p className="mt-1.5 text-xl font-semibold">{books.length}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(255,255,255,0.48))] px-3 py-3 shadow-[0_16px_34px_-28px_rgba(0,0,0,0.24)] backdrop-blur-md">
                <p className="text-[11px] tracking-[0.14em] text-muted-foreground">阅读中</p>
                <p className="mt-1.5 text-xl font-semibold">
                  {Object.values(progressMap).filter((v) => v > 0 && v < 1).length}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(255,255,255,0.48))] px-3 py-3 shadow-[0_16px_34px_-28px_rgba(0,0,0,0.24)] backdrop-blur-md">
                <p className="text-[11px] tracking-[0.14em] text-muted-foreground">已完成</p>
                <p className="mt-1.5 text-xl font-semibold">
                  {Object.values(progressMap).filter((v) => v >= 1).length}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(255,255,255,0.48))] px-3 py-3 shadow-[0_16px_34px_-28px_rgba(0,0,0,0.24)] backdrop-blur-md">
                <p className="text-[11px] tracking-[0.14em] text-muted-foreground">总阅读时长</p>
                <p className="mt-1.5 text-xl font-semibold">
                  {formatDuration(Object.values(readingDurationMap).reduce((sum, d) => sum + d, 0))}
                </p>
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="animate-reader-fade-up grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6" style={{ animationDelay: "80ms" }}>
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
