"use client";

import { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { BookGrid } from "@/components/bookshelf/BookGrid";
import { SearchBar } from "@/components/bookshelf/SearchBar";
import { UploadDialog } from "@/components/bookshelf/UploadDialog";
import { Book } from "@/lib/db/schema";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function BookshelfPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);

  const fetchBooks = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);

      const res = await fetch(`/api/books?${params}`);
      const data = await res.json();

      if (res.ok) {
        setBooks(data.books);

        // Fetch progress for each book
        const progressPromises = data.books.map(async (book: Book) => {
          try {
            const pRes = await fetch(`/api/progress?bookId=${book.id}`);
            const pData = await pRes.json();
            return { bookId: book.id, progress: pData.progress?.progress || 0 };
          } catch {
            return { bookId: book.id, progress: 0 };
          }
        });

        const progressResults = await Promise.all(progressPromises);
        const map: Record<string, number> = {};
        progressResults.forEach((r) => {
          map[r.bookId] = r.progress;
        });
        setProgressMap(map);
      }
    } catch (error) {
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
    <div className="min-h-screen bg-background">
      <Navbar onUploadClick={() => setUploadOpen(true)} />

      <main className="container mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">我的书架</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {books.length > 0 ? `共 ${books.length} 本书` : "开始你的阅读之旅"}
            </p>
          </div>
          <SearchBar value={search} onChange={setSearch} />
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground mt-4">加载中...</p>
          </div>
        ) : (
          <BookGrid
            books={books}
            progressMap={progressMap}
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
