"use client";

import { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { BookGrid } from "@/components/bookshelf/BookGrid";
import { BookCardSkeleton } from "@/components/bookshelf/BookCardSkeleton";
import { SearchBar } from "@/components/bookshelf/SearchBar";
import { UploadDialog } from "@/components/bookshelf/UploadDialog";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import type { Book } from "@/lib/db/schema";

const SKELETON_COUNT = 8;

export default function BookshelfPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [lastReadAtMap, setLastReadAtMap] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
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

  const handleDelete = async (bookId: string) => {
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
  };

  return (
    <div className="min-h-screen">
      <Navbar onUploadClick={() => setUploadOpen(true)} />

      <main className="mx-auto w-full max-w-7xl px-3 pb-8 pt-5 sm:px-4 sm:pb-10 sm:pt-7">
        <section className="section-shell mb-6 p-4 sm:mb-8 sm:p-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">我的书架</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {books.length > 0 ? `共 ${books.length} 本书，继续今天的阅读。` : "开始你的阅读之旅"}
                </p>
              </div>
              <div className="w-full sm:w-auto">
                <SearchBar value={search} onChange={setSearch} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border/80 bg-card/80 px-3 py-2.5">
                <p className="text-xs text-muted-foreground">书籍总数</p>
                <p className="mt-1 text-lg font-semibold">{books.length}</p>
              </div>
              <div className="rounded-xl border border-border/80 bg-card/80 px-3 py-2.5">
                <p className="text-xs text-muted-foreground">阅读中</p>
                <p className="mt-1 text-lg font-semibold">
                  {Object.values(progressMap).filter((v) => v > 0 && v < 1).length}
                </p>
              </div>
              <div className="rounded-xl border border-border/80 bg-card/80 px-3 py-2.5 col-span-2 sm:col-span-1">
                <p className="text-xs text-muted-foreground">已完成</p>
                <p className="mt-1 text-lg font-semibold">
                  {Object.values(progressMap).filter((v) => v >= 1).length}
                </p>
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <BookCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <BookGrid
            books={books}
            progressMap={progressMap}
            lastReadAtMap={lastReadAtMap}
            onDelete={handleDelete}
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
