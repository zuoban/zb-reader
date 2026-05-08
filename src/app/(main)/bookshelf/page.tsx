"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Check, Tags, X } from "lucide-react";
import { toast } from "sonner";
import { BackgroundDecoration } from "@/components/bookshelf/BackgroundDecoration";
import { BookCardSkeleton } from "@/components/bookshelf/BookCardSkeleton";
import { BookGrid } from "@/components/bookshelf/BookGrid";
import { Navbar } from "@/components/layout/Navbar";
import { READER_RETURN_SPOTLIGHT_KEY } from "@/components/layout/ReaderRouteTransition";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [lastReadAtMap, setLastReadAtMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [spotlightBookId, setSpotlightBookId] = useState<string | null>(null);
  const [categoryDialogBook, setCategoryDialogBook] = useState<Book | null>(null);
  const [deleteDialogBook, setDeleteDialogBook] = useState<Book | null>(null);
  const [categoryInput, setCategoryInput] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);
  const [deletingBook, setDeletingBook] = useState(false);
  const deleteCancelButtonRef = useRef<HTMLButtonElement>(null);
  const { setTheme } = useTheme();
  const activeCategoryName = selectedCategory === ALL_CATEGORY ? "" : selectedCategory;

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
      if (activeCategoryName) {
        params.set("category", activeCategoryName);
      }

      const res = await fetch(`/api/books?${params}`);
      const data = await res.json();

      if (res.ok) {
        setBooks(data.books);
        setCategories(data.categories || []);
        setTotalBooks(data.allTotal ?? data.total ?? 0);
        setProgressMap(data.progressMap || {});
        setLastReadAtMap(data.lastReadAtMap || {});
      }
    } catch {
      toast.error("获取书籍失败");
    } finally {
      setLoading(false);
    }
  }, [activeCategoryName]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

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

  useEffect(() => {
    if (!deleteDialogBook) return;

    deleteCancelButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !deletingBook) {
        setDeleteDialogBook(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteDialogBook, deletingBook]);

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

  return (
    <div className="app-noise liquid-page min-h-screen bg-background">
      <BackgroundDecoration />
      <Navbar onUploadComplete={fetchBooks} />

      <main className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-10 pt-6 sm:px-6 sm:pb-14 sm:pt-8">
        <div className="surface-glass surface-elevated mb-6 -mx-1 flex w-fit max-w-[calc(100%+0.5rem)] gap-1 overflow-x-auto rounded-2xl p-1.5 [scrollbar-width:none] sm:mb-8 [&::-webkit-scrollbar]:hidden">
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
            spotlightBookId={spotlightBookId}
            emptyTitle={activeCategoryName ? "这个分类还没有书" : undefined}
            emptyDescription={activeCategoryName ? "可以从其他图书的菜单中设置分类，或切回全部书籍继续浏览。" : undefined}
            onDelete={handleRequestDelete}
            onChangeCategory={handleOpenCategoryDialog}
          />
        )}
      </main>

      {deleteDialogBook ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/42 p-4 backdrop-blur-md"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deletingBook) {
              setDeleteDialogBook(null);
            }
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-book-title"
            aria-describedby="delete-book-description"
            className="liquid-panel w-full max-w-md overflow-hidden rounded-2xl border p-6 outline-none"
          >
            <div className="liquid-hairline absolute inset-x-4 top-0 h-px" />
            <div className="space-y-2 text-center sm:text-left">
              <h2 id="delete-book-title" className="text-lg font-semibold">
                删除这本书？
              </h2>
              <p id="delete-book-description" className="text-sm leading-6 text-muted-foreground">
                将从书架中移除《{deleteDialogBook.title || "未命名书籍"}》及其本地文件。此操作无法撤销。
              </p>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                ref={deleteCancelButtonRef}
                type="button"
                variant="outline"
                className="cursor-pointer"
                disabled={deletingBook}
                onClick={() => setDeleteDialogBook(null)}
              >
                取消
              </Button>
              <Button
                type="button"
                className="cursor-pointer border border-destructive/30 bg-destructive/90 text-white hover:bg-destructive focus-visible:ring-destructive/20"
                disabled={deletingBook}
                onClick={handleConfirmDelete}
              >
                删除
              </Button>
            </div>
          </div>
        </div>
      ) : null}

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
