"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Tags, X } from "lucide-react";
import { toast } from "sonner";
import { BackgroundDecoration } from "@/components/bookshelf/BackgroundDecoration";
import { SearchBar } from "@/components/bookshelf/SearchBar";
import { BookCardSkeleton } from "@/components/bookshelf/BookCardSkeleton";
import { BookGrid } from "@/components/bookshelf/BookGrid";
import { Navbar } from "@/components/layout/Navbar";
import { useTheme } from "@/components/layout/ThemeProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { Book } from "@/lib/db/schema";

const SKELETON_COUNT = 8;
const ALL_CATEGORY = "__all__";

interface CategorySummary {
  name: string;
  count: number;
}

export default function BookshelfPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [totalBooks, setTotalBooks] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORY);
  const [searchQuery, setSearchQuery] = useState("");
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [lastReadAtMap, setLastReadAtMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [spotlightBookId, _setSpotlightBookId] = useState<string | null>(null);
  const [categoryDialogBook, setCategoryDialogBook] = useState<Book | null>(null);
  const [deleteDialogBook, setDeleteDialogBook] = useState<Book | null>(null);
  const [categoryInput, setCategoryInput] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);
  const [deletingBook, setDeletingBook] = useState(false);
  const { setTheme } = useTheme();
  const activeCategoryName = selectedCategory === ALL_CATEGORY ? "" : selectedCategory;

  // Reset page when category or search changes
  const resetPagination = useCallback(() => {
    setPage(1);
    setBooks([]);
    setLoading(true);
  }, []);

  useEffect(() => {
    resetPagination(); // eslint-disable-line react-hooks/set-state-in-effect -- pagination reset on filter change
  }, [selectedCategory, searchQuery, resetPagination]);

  // Sync theme with reader settings on mount
  useEffect(() => {
    async function syncTheme() {
      try {
        const res = await fetch("/api/reader-settings");
        if (!res.ok) return;
        const data = await res.json();
        const settings = data.settings;
        
        if (settings?.theme) {
          // Keep the global theme aligned with reader settings.
          const globalTheme = settings.theme === "dark" ? "dark" : "light";
          setTheme(globalTheme);
        }
      } catch {
        // ignore
      }
    }
    syncTheme();
  }, [setTheme]);

  const fetchBooks = useCallback(async (isInitial = false) => {
    const currentPage = isInitial ? 1 : page;
    try {
      const params = new URLSearchParams();
      params.set("withProgress", "true");
      params.set("page", currentPage.toString());
      params.set("limit", "20");
      if (activeCategoryName) {
        params.set("category", activeCategoryName);
      }
      if (searchQuery) {
        params.set("search", searchQuery);
      }

      const res = await fetch(`/api/books?${params}`);
      const data = await res.json();

      if (res.ok) {
        if (currentPage === 1) {
          setBooks(data.books);
          setProgressMap(data.progressMap || {});
          setLastReadAtMap(data.lastReadAtMap || {});
        } else {
          setBooks((prev) => [...prev, ...data.books]);
          setProgressMap((prev) => ({ ...prev, ...(data.progressMap || {}) }));
          setLastReadAtMap((prev) => ({ ...prev, ...(data.lastReadAtMap || {}) }));
        }
        
        setCategories(data.categories || []);
        setTotalBooks(data.allTotal ?? data.total ?? 0);
        
        // Check if there are more books to load
        const totalFetched = (currentPage - 1) * 20 + data.books.length;
        setHasMore(totalFetched < (data.total || 0));
      }
    } catch {
      toast.error("获取书籍失败");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [activeCategoryName, page, searchQuery]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetchBooks internally calls setState via data fetching callbacks
    fetchBooks(page === 1);
  }, [fetchBooks, page]);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      setLoadingMore(true);
      setPage((p) => p + 1);
    }
  }, [hasMore, loadingMore]);

  const handleRequestDelete = useCallback((bookId: string) => {
    const book = books.find((item) => item.id === bookId);
    if (book) {
      setDeleteDialogBook(book);
    }
  }, [books]);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteDialogBook) return;

    setDeletingBook(true);
    try {
      const res = await fetch(`/api/books/${deleteDialogBook.id}`, { method: "DELETE" });
      if (res.ok) {
        setBooks((prev) => prev.filter((b) => b.id !== deleteDialogBook.id));
        setDeleteDialogBook(null);
        toast.success("删除成功");
      } else {
        toast.error("删除失败");
      }
    } catch {
      toast.error("删除失败");
    } finally {
      setDeletingBook(false);
    }
  }, [deleteDialogBook]);

  const handleOpenCategoryDialog = useCallback((book: Book) => {
    setCategoryDialogBook(book);
    setCategoryInput(book.category || "");
  }, []);

  const handleSaveCategory = useCallback(async () => {
    if (!categoryDialogBook) return;

    const nextCategory = categoryInput.trim();
    if (nextCategory.length > 40) {
      toast.error("分类名称不能超过 40 个字符");
      return;
    }

    setSavingCategory(true);
    try {
      const res = await fetch(`/api/books/${categoryDialogBook.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: nextCategory }),
      });

      if (!res.ok) {
        toast.error("分类保存失败");
        return;
      }

      setCategoryDialogBook(null);
      setCategoryInput("");
      await fetchBooks();
      toast.success(nextCategory ? "分类已更新" : "分类已清除");
    } catch {
      toast.error("分类保存失败");
    } finally {
      setSavingCategory(false);
    }
  }, [categoryDialogBook, categoryInput, fetchBooks]);

  const handleUploadComplete = useCallback(() => {
    if (page === 1) {
      fetchBooks(true);
    } else {
      setPage(1);
    }
  }, [fetchBooks, page]);

  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore || loading || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          handleLoadMore();
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasMore, loading, loadingMore, handleLoadMore]);

  return (
    <div className="app-noise liquid-page min-h-screen bg-background">
      <BackgroundDecoration />
      <Navbar onUploadComplete={handleUploadComplete} />

      <main className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-10 pt-8 sm:px-6 sm:pb-14 sm:pt-12">
        <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative -mx-1 flex w-fit max-w-[calc(100%+0.5rem)] gap-1 overflow-x-auto rounded-2xl border border-white/30 bg-white/40 p-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.06)] backdrop-blur-xl saturate-150 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden dark:border-white/10 dark:bg-black/20">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "h-8.5 cursor-pointer rounded-xl px-3.5 text-xs font-semibold transition-all duration-400",
                selectedCategory === ALL_CATEGORY
                  ? "category-filter-button-active"
                  : "text-muted-foreground/80 hover:bg-background/40 hover:text-foreground"
              )}
              onClick={() => setSelectedCategory(ALL_CATEGORY)}
            >
              全部
              <Badge
                variant="outline"
                className={cn(
                  "ml-1.5 border-transparent bg-foreground/5 px-1.5 py-0 text-[10px] font-bold text-muted-foreground/80 shadow-none transition-colors",
                  selectedCategory === ALL_CATEGORY && "bg-[color:var(--cta)]/15 text-[color:var(--cta)]"
                )}
              >
                {totalBooks}
              </Badge>
            </Button>
            {categories.map((category) => (
              <Button
                key={category.name}
                type="button"
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8.5 cursor-pointer rounded-xl px-3.5 text-xs font-semibold transition-all duration-400",
                  selectedCategory === category.name
                    ? "category-filter-button-active"
                    : "text-muted-foreground/80 hover:bg-background/40 hover:text-foreground"
                )}
                onClick={() => setSelectedCategory(category.name)}
              >
                <span className="max-w-32 truncate">{category.name}</span>
                <Badge
                  variant="outline"
                  className={cn(
                    "ml-1.5 border-transparent bg-foreground/5 px-1.5 py-0 text-[10px] font-bold text-muted-foreground/80 shadow-none transition-colors",
                    selectedCategory === category.name && "bg-[color:var(--cta)]/15 text-[color:var(--cta)]"
                  )}
                >
                  {category.count}
                </Badge>
              </Button>
            ))}
          </div>

          <SearchBar 
            onSearch={setSearchQuery} 
            className="w-full sm:w-72" 
          />
        </div>

        {/* Book Grid */}
        {loading && page === 1 ? (
          <div className="animate-reader-fade-up grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-3.5 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6" style={{ animationDelay: "120ms" }}>
            {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <BookCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <>
            <BookGrid
              books={books}
              progressMap={progressMap}
              lastReadAtMap={lastReadAtMap}
              spotlightBookId={spotlightBookId}
              emptyTitle={activeCategoryName ? "这个分类还没有书" : undefined}
              emptyDescription={activeCategoryName ? "可以从其他图书的菜单中设置分类，或切回全部书籍继续浏览。" : undefined}
              onDelete={handleRequestDelete}
              onChangeCategory={handleOpenCategoryDialog}
            />
            
            {/* Load More Trigger & Indicator */}
            <div 
              ref={loadMoreRef} 
              className="mt-12 flex flex-col items-center justify-center gap-4 py-8"
            >
              {hasMore ? (
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="liquid-control h-11 min-w-[140px] rounded-2xl border-white/20 bg-white/40 px-8 text-sm font-bold shadow-sm transition-all duration-400 hover:scale-[1.02] hover:bg-white/60 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                >
                  {loadingMore ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                      <span>正在加载...</span>
                    </div>
                  ) : (
                    "加载更多"
                  )}
                </Button>
              ) : books.length > 0 ? (
                <div className="flex flex-col items-center gap-2 opacity-40">
                  <div className="h-px w-12 bg-muted-foreground/30" />
                  <p className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">
                    已经到底了
                  </p>
                </div>
              ) : null}
            </div>
          </>
        )}
      </main>

      <AlertDialog open={Boolean(deleteDialogBook)} onOpenChange={(open) => {
        if (!open && !deletingBook) {
          setDeleteDialogBook(null);
        }
      }}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>删除这本书？</AlertDialogTitle>
            <AlertDialogDescription>
              将从书架中移除《{deleteDialogBook?.title || "未命名书籍"}》及其本地文件。此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingBook}>取消</AlertDialogCancel>
            <AlertDialogAction
              className="border-destructive/30 bg-destructive/90 text-white hover:bg-destructive focus-visible:ring-destructive/20"
              disabled={deletingBook}
              onClick={handleConfirmDelete}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={Boolean(categoryDialogBook)}
        onOpenChange={(open) => {
          if (!open) {
            setCategoryDialogBook(null);
            setCategoryInput("");
          }
        }}
      >
        <DialogContent className="overflow-hidden rounded-2xl sm:max-w-md">
          <div className="liquid-hairline absolute inset-x-4 top-0 h-px" />
          <DialogHeader>
            <DialogTitle>设置分类</DialogTitle>
            <DialogDescription>
              为《{categoryDialogBook?.title || "未命名书籍"}》设置一个书架分类。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="book-category">分类名称</Label>
            <Input
              id="book-category"
              value={categoryInput}
              maxLength={40}
              placeholder="例如：小说、技术、历史"
              onChange={(event) => setCategoryInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleSaveCategory();
                }
              }}
            />
            <p className="text-xs text-muted-foreground">留空保存即可清除分类。</p>
          </div>
          {categories.length > 0 ? (
            <div className="grid gap-2">
              <Label>已有分类</Label>
              <div className="liquid-control flex max-h-28 flex-wrap gap-2 overflow-y-auto rounded-xl p-2">
                {categories.map((category) => {
                  const isSelected = categoryInput.trim() === category.name;

                  return (
                    <Button
                      key={category.name}
                      type="button"
                      variant="ghost"
                      size="xs"
                      className={cn(
                        "h-7 cursor-pointer rounded-lg px-2 text-xs",
                        isSelected ? "liquid-pill-active" : "liquid-control"
                      )}
                      onClick={() => setCategoryInput(category.name)}
                    >
                      {isSelected ? <Check className="h-3 w-3" /> : <Tags className="h-3 w-3" />}
                      <span className="max-w-28 truncate">{category.name}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              onClick={() => {
                setCategoryDialogBook(null);
                setCategoryInput("");
              }}
            >
              <X className="h-4 w-4" />
              取消
            </Button>
            <Button
              type="button"
              className="cursor-pointer"
              disabled={savingCategory}
              onClick={handleSaveCategory}
            >
              <Check className="h-4 w-4" />
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
