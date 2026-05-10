"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Loader2, Tags } from "lucide-react";
import { SearchBar } from "@/components/bookshelf/SearchBar";
import { BackgroundDecoration } from "@/components/bookshelf/BackgroundDecoration";
import { BookCardSkeleton } from "@/components/bookshelf/BookCardSkeleton";
import { BookGrid } from "@/components/bookshelf/BookGrid";
import { useBookCategoryAction } from "@/components/bookshelf/hooks/useBookCategoryAction";
import { useBookDeleteAction } from "@/components/bookshelf/hooks/useBookDeleteAction";
import { ALL_CATEGORY, useBookshelfData } from "@/components/bookshelf/hooks/useBookshelfData";
import { Navbar } from "@/components/layout/Navbar";
import { useTheme } from "@/components/layout/ThemeProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import type { BookshelfInitialData } from "@/components/bookshelf/hooks/useBookshelfData";

const SKELETON_COUNT = 8;

export type { BookshelfInitialData };

interface BookshelfClientProps {
  initialData: BookshelfInitialData;
}

export function BookshelfClient({ initialData }: BookshelfClientProps) {
  const {
    activeCategoryName,
    books,
    categories,
    handleLoadMore,
    hasMore,
    lastReadAtMap,
    loading,
    loadingMore,
    page,
    progressMap,
    refreshBooks,
    removeBook,
    selectedCategory,
    setSearchQuery,
    setSelectedCategory,
    totalBooks,
  } = useBookshelfData(initialData);
  const [spotlightBookId, _setSpotlightBookId] = useState<string | null>(null);
  const { setTheme } = useTheme();
  const {
    categoryDialogBook,
    categoryInput,
    handleCategoryDialogOpenChange,
    openCategoryDialog: handleOpenCategoryDialog,
    saveCategory: handleSaveCategory,
    savingCategory,
    setCategoryInput,
  } = useBookCategoryAction({ onSaved: refreshBooks });
  const {
    confirmDelete: handleConfirmDelete,
    deleteDialogBook,
    deletingBook,
    handleDeleteDialogOpenChange,
    requestDelete: handleRequestDelete,
  } = useBookDeleteAction({
    books,
    onDeleted: removeBook,
  });

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

  const handleUploadComplete = useCallback(() => {
    void refreshBooks();
  }, [refreshBooks]);

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
    <div className="relative min-h-screen bg-background">
      <BackgroundDecoration />
      <Navbar onUploadComplete={handleUploadComplete} />

      <main className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-10 pt-8 sm:px-6 sm:pb-14 sm:pt-12">
        <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="category-filter-shell flex w-fit max-w-[calc(100%+0.5rem)] gap-1 overflow-x-auto rounded-full p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "h-9 cursor-pointer rounded-full px-4 text-xs font-medium transition-all duration-300",
                selectedCategory === ALL_CATEGORY
                  ? "category-filter-button-active shadow-sm"
                  : "category-filter-button hover:bg-background/40"
              )}
              onClick={() => setSelectedCategory(ALL_CATEGORY)}
            >
              全部
              <Badge
                variant="outline"
                className={cn(
                  "ml-2 border-transparent bg-foreground/5 px-1.5 py-0 text-[10px] font-bold text-muted-foreground transition-colors",
                  selectedCategory === ALL_CATEGORY && "bg-primary-foreground/20 text-primary-foreground"
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
                  "h-9 cursor-pointer rounded-full px-4 text-xs font-medium transition-all duration-300",
                  selectedCategory === category.name
                    ? "category-filter-button-active shadow-sm"
                    : "category-filter-button hover:bg-background/40"
                )}
                onClick={() => setSelectedCategory(category.name)}
              >
                <span className="max-w-32 truncate">{category.name}</span>
                <Badge
                  variant="outline"
                  className={cn(
                    "ml-2 border-transparent bg-foreground/5 px-1.5 py-0 text-[10px] font-bold text-muted-foreground transition-colors",
                    selectedCategory === category.name && "bg-primary-foreground/20 text-primary-foreground"
                  )}
                >
                  {category.count}
                </Badge>
              </Button>
            ))}
          </div>

          <SearchBar 
            onSearch={setSearchQuery} 
            className="w-full sm:w-80" 
          />
        </div>

        {/* Book Grid */}
        {loading && page === 1 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
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
              className="mt-16 flex flex-col items-center justify-center gap-4 py-8"
            >
              {hasMore ? (
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="liquid-control h-12 min-w-[160px] cursor-pointer rounded-full px-8 text-sm font-medium shadow-sm"
                >
                  {loadingMore ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      <span>正在加载...</span>
                    </div>
                  ) : (
                    "加载更多"
                  )}
                </Button>
              ) : books.length > 0 ? (
                <div className="flex flex-col items-center gap-2 opacity-30">
                  <div className="h-px w-16 bg-muted-foreground" />
                  <p className="text-[10px] font-medium tracking-[0.2em] text-muted-foreground uppercase">
                    THE END
                  </p>
                </div>
              ) : null}
            </div>
          </>
        )}
      </main>

      <AlertDialog open={Boolean(deleteDialogBook)} onOpenChange={handleDeleteDialogOpenChange}>
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
        onOpenChange={handleCategoryDialogOpenChange}
      >
        <DialogContent className="liquid-panel overflow-hidden border-none p-0 sm:max-w-md shadow-2xl">
          {/* Background Dampening */}
          <div className="absolute inset-0 bg-background/60 backdrop-blur-3xl -z-10" />
          <div className="liquid-hairline absolute inset-x-5 top-0 h-px opacity-40" />

          <div className="flex flex-col relative">
            {/* Header Section */}
            <div className="px-6 pt-8 pb-5">
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/20 text-primary shadow-sm border border-primary/10">
                    <Tags className="h-5 w-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                      设置分类
                    </DialogTitle>
                    <DialogDescription className="mt-0.5 text-[10px] font-black tracking-[0.2em] text-primary/60 uppercase">
                      Organize Book
                    </DialogDescription>
                  </div>
                </div>
                <p className="mt-5 text-[13px] font-medium leading-relaxed text-foreground/80">
                  为《{categoryDialogBook?.title || "未命名书籍"}》设置一个书架分类。
                </p>
              </DialogHeader>
            </div>

            <div className="px-6 space-y-6">
              <div className="grid gap-2.5">
                <Label htmlFor="book-category" className="text-[11px] font-black tracking-widest text-foreground/40 uppercase pl-1">
                  分类名称
                </Label>
                <div className="relative">
                  <Input
                    id="book-category"
                    value={categoryInput}
                    maxLength={40}
                    placeholder="例如：小说、技术、历史"
                    className="h-11 border-none bg-background/40 pl-4 pr-4 text-sm font-bold text-foreground shadow-inner focus-visible:ring-1 focus-visible:ring-primary/40 rounded-xl"
                    onChange={(event) => setCategoryInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleSaveCategory();
                      }
                    }}
                  />
                </div>
                <p className="pl-1 text-[11px] font-medium text-foreground/40">
                  留空保存即可清除分类。
                </p>
              </div>

              {categories.length > 0 ? (
                <div className="grid gap-2.5">
                  <Label className="text-[11px] font-black tracking-widest text-foreground/40 uppercase pl-1">
                    已有分类
                  </Label>
                  <div className="relative overflow-hidden rounded-2xl border border-border/30 bg-background/40 shadow-inner">
                    <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto p-3 [scrollbar-width:thin] bg-muted/5">
                      {categories.map((category) => {
                        const isSelected = categoryInput.trim() === category.name;

                        return (
                          <Button
                            key={category.name}
                            type="button"
                            variant="ghost"
                            className={cn(
                              "h-8 cursor-pointer rounded-lg px-3 text-xs font-bold transition-all border",
                              isSelected 
                                ? "bg-primary text-primary-foreground border-primary shadow-sm scale-105" 
                                : "bg-background/50 text-foreground/60 border-border/20 hover:bg-primary/10 hover:text-primary hover:border-primary/20"
                            )}
                            onClick={() => setCategoryInput(category.name)}
                          >
                            {isSelected ? <Check className="h-3 w-3 mr-1.5" /> : <Tags className="h-3 w-3 mr-1.5 opacity-40" />}
                            <span className="max-w-28 truncate">{category.name}</span>
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Action Section */}
            <div className="flex justify-end p-6 pt-8">
              <Button
                type="button"
                className="h-11 min-w-[140px] cursor-pointer rounded-xl bg-primary text-primary-foreground shadow-[0_8px_16px_-6px_rgba(var(--primary-rgb),0.3),inset_0_1px_0_rgba(255,255,255,0.2)] hover:bg-primary/90 hover:shadow-[0_12px_20px_-6px_rgba(var(--primary-rgb),0.4)] px-8 text-[11px] font-black tracking-[0.25em] uppercase transition-all active:scale-95"
                disabled={savingCategory}
                onClick={handleSaveCategory}
              >
                {savingCategory ? (
                  <Loader2 className="mr-2.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="mr-2.5 h-3.5 w-3.5 stroke-[3px]" />
                )}
                保存更改
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
