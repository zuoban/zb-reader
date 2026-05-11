"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
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
import { cn } from "@/lib/utils";
import type { BookshelfInitialData } from "@/components/bookshelf/hooks/useBookshelfData";

const SKELETON_COUNT = 8;

const BookCategoryDialog = dynamic(
  () => import("@/components/bookshelf/BookCategoryDialog").then((mod) => mod.BookCategoryDialog),
  { ssr: false }
);
const BookDeleteDialog = dynamic(
  () => import("@/components/bookshelf/BookDeleteDialog").then((mod) => mod.BookDeleteDialog),
  { ssr: false }
);

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
          <div className="category-filter-shell flex w-full max-w-full gap-1 overflow-x-auto rounded-full p-1 sm:w-fit [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "h-10 cursor-pointer rounded-full px-4 text-sm font-semibold transition-all duration-200",
                selectedCategory === ALL_CATEGORY
                  ? "category-filter-button-active"
                  : "category-filter-button"
              )}
              aria-pressed={selectedCategory === ALL_CATEGORY}
              onClick={() => setSelectedCategory(ALL_CATEGORY)}
            >
              全部
              <Badge
                variant="ghost"
                className={cn(
                  "category-filter-count",
                  selectedCategory === ALL_CATEGORY && "category-filter-count-active"
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
                  "h-10 cursor-pointer rounded-full px-4 text-sm font-semibold transition-all duration-200",
                  selectedCategory === category.name
                    ? "category-filter-button-active"
                    : "category-filter-button"
                )}
                aria-pressed={selectedCategory === category.name}
                onClick={() => setSelectedCategory(category.name)}
              >
                <span className="max-w-32 truncate">{category.name}</span>
                <Badge
                  variant="ghost"
                  className={cn(
                    "category-filter-count",
                    selectedCategory === category.name && "category-filter-count-active"
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

      {deleteDialogBook ? (
        <BookDeleteDialog
          bookTitle={deleteDialogBook.title}
          deletingBook={deletingBook}
          open={Boolean(deleteDialogBook)}
          onConfirm={handleConfirmDelete}
          onOpenChange={handleDeleteDialogOpenChange}
        />
      ) : null}

      {categoryDialogBook ? (
        <BookCategoryDialog
          book={categoryDialogBook}
          categories={categories}
          categoryInput={categoryInput}
          savingCategory={savingCategory}
          onCategoryInputChange={setCategoryInput}
          onOpenChange={handleCategoryDialogOpenChange}
          onSave={handleSaveCategory}
        />
      ) : null}
    </div>
  );
}
