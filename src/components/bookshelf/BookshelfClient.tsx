"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Check, CheckSquare, ChevronDown, Tags, Trash2, X } from "lucide-react";
import { SearchBar } from "@/components/bookshelf/SearchBar";
import { BookshelfActionButton } from "@/components/bookshelf/BookshelfActionButton";
import { BackgroundDecoration } from "@/components/bookshelf/BackgroundDecoration";
import { BookCardSkeleton } from "@/components/bookshelf/BookCardSkeleton";
import { BookGrid } from "@/components/bookshelf/BookGrid";
import { useBatchBookCategoryAction } from "@/components/bookshelf/hooks/useBatchBookCategoryAction";
import { useBatchBookDeleteAction } from "@/components/bookshelf/hooks/useBatchBookDeleteAction";
import { useBookCategoryAction } from "@/components/bookshelf/hooks/useBookCategoryAction";
import { useBookDeleteAction } from "@/components/bookshelf/hooks/useBookDeleteAction";
import { ALL_CATEGORY, useBookshelfData } from "@/components/bookshelf/hooks/useBookshelfData";
import { Navbar } from "@/components/layout/Navbar";
import { useTheme } from "@/components/layout/ThemeProvider";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UNCATEGORIZED_CATEGORY, UNCATEGORIZED_CATEGORY_LABEL } from "@/lib/book-category";
import { getColumnsFromWidth } from "@/lib/utils";
import type { BookshelfInitialData } from "@/components/bookshelf/hooks/useBookshelfData";

const BookCategoryDialog = dynamic(
  () => import("@/components/bookshelf/BookCategoryDialog").then((mod) => mod.BookCategoryDialog),
  { ssr: false }
);
const BookDeleteDialog = dynamic(
  () => import("@/components/bookshelf/BookDeleteDialog").then((mod) => mod.BookDeleteDialog),
  { ssr: false }
);
const BatchBookCategoryDialog = dynamic(
  () => import("@/components/bookshelf/BatchBookCategoryDialog").then((mod) => mod.BatchBookCategoryDialog),
  { ssr: false }
);
const BatchBookDeleteDialog = dynamic(
  () => import("@/components/bookshelf/BatchBookDeleteDialog").then((mod) => mod.BatchBookDeleteDialog),
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
    removeBooks,
    selectedCategory,
    setSearchQuery,
    setSelectedCategory,
    totalBooks,
  } = useBookshelfData(initialData);
  const [spotlightBookId, _setSpotlightBookId] = useState<string | null>(null);
  const [batchMode, setBatchMode] = useState(false);
  const [selectedBookIds, setSelectedBookIds] = useState<Set<string>>(() => new Set());
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
  const handleBatchSaved = useCallback(async () => {
    await refreshBooks();
    setSelectedBookIds(new Set());
    setBatchMode(false);
  }, [refreshBooks]);
  const {
    batchCategoryDialogOpen,
    batchCategoryInput,
    handleBatchCategoryDialogOpenChange,
    openBatchCategoryDialog: handleOpenBatchCategoryDialog,
    saveBatchCategory: handleSaveBatchCategory,
    savingBatchCategory,
    setBatchCategoryInput,
  } = useBatchBookCategoryAction({ onSaved: handleBatchSaved });

  const handleBatchDeleted = useCallback(async (bookIds: string[]) => {
    removeBooks(bookIds);
    setSelectedBookIds(new Set());
    setBatchMode(false);
    // Refresh to get accurate category counts and total
    await refreshBooks();
  }, [refreshBooks, removeBooks]);

  const {
    batchDeleteDialogOpen,
    confirmBatchDelete,
    deletingBooks,
    handleBatchDeleteDialogOpenChange,
    openBatchDeleteDialog: handleOpenBatchDeleteDialog,
  } = useBatchBookDeleteAction({ onDeleted: handleBatchDeleted });

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

  // Keep the global theme aligned with server-loaded reader settings.
  useEffect(() => {
    setTheme(initialData.theme);
  }, [initialData.theme, setTheme]);

  const handleUploadComplete = useCallback(() => {
    void refreshBooks();
  }, [refreshBooks]);

  const selectedBookCount = selectedBookIds.size;
  const selectedBookIdList = useMemo(() => Array.from(selectedBookIds), [selectedBookIds]);
  const uncategorizedCount = Math.max(
    totalBooks - categories.reduce((sum, category) => sum + category.count, 0),
    0
  );
  const selectedCategorySummary = useMemo(() => {
    if (selectedCategory === ALL_CATEGORY) {
      return { name: "全部", count: totalBooks };
    }

    if (selectedCategory === UNCATEGORIZED_CATEGORY) {
      return { name: UNCATEGORIZED_CATEGORY_LABEL, count: uncategorizedCount };
    }

    const category = categories.find((item) => item.name === selectedCategory);
    return { name: selectedCategory, count: category?.count ?? 0 };
  }, [categories, selectedCategory, totalBooks, uncategorizedCount]);

  const handleBatchModeToggle = useCallback(() => {
    setBatchMode((current) => {
      if (current) {
        setSelectedBookIds(new Set());
      }
      return !current;
    });
  }, []);

  const handleToggleBookSelect = useCallback((bookId: string) => {
    setSelectedBookIds((current) => {
      const next = new Set(current);
      if (next.has(bookId)) {
        next.delete(bookId);
      } else {
        next.add(bookId);
      }
      return next;
    });
  }, []);

  const handleClearSelectedBooks = useCallback(() => {
    setSelectedBookIds(new Set());
  }, []);

  const [skeletonColumns, setSkeletonColumns] = useState(2);

  useEffect(() => {
    const calc = () => setSkeletonColumns(getColumnsFromWidth(window.innerWidth));
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  const skeletonCount = skeletonColumns * 3;

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

      <main className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-12 pt-6 sm:px-6 sm:pb-16 sm:pt-10">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="w-full sm:w-auto sm:min-w-[220px]">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <BookshelfActionButton
                  type="button"
                  actionVariant="filter"
                  aria-label={`分类：${selectedCategorySummary.name}`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Tags className="h-4 w-4 shrink-0 text-primary/70" />
                    <span className="text-muted-foreground">分类：</span>
                    <span className="truncate text-foreground">{selectedCategorySummary.name}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <Badge
                      variant="ghost"
                      className="bookshelf-category-count rounded-md bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground"
                    >
                      {selectedCategorySummary.count}
                    </Badge>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </span>
                </BookshelfActionButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 rounded-2xl p-1.5">
                <DropdownMenuItem
                  className="cursor-pointer justify-between"
                  onClick={() => setSelectedCategory(ALL_CATEGORY)}
                >
                  <span className="flex items-center gap-2">
                    {selectedCategory === ALL_CATEGORY ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : (
                      <span className="h-4 w-4" />
                    )}
                    全部
                  </span>
                  <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
                    {totalBooks}
                  </span>
                </DropdownMenuItem>
                {categories.map((category) => (
                  <DropdownMenuItem
                    key={category.name}
                    className="cursor-pointer justify-between"
                    onClick={() => setSelectedCategory(category.name)}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      {selectedCategory === category.name ? (
                        <Check className="h-4 w-4 shrink-0 text-primary" />
                      ) : (
                        <span className="h-4 w-4 shrink-0" />
                      )}
                      <span className="truncate">{category.name}</span>
                    </span>
                    <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
                      {category.count}
                    </span>
                  </DropdownMenuItem>
                ))}
                {batchMode ? (
                  <DropdownMenuItem
                    className="cursor-pointer justify-between"
                    onClick={() => setSelectedCategory(UNCATEGORIZED_CATEGORY)}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      {selectedCategory === UNCATEGORIZED_CATEGORY ? (
                        <Check className="h-4 w-4 shrink-0 text-primary" />
                      ) : (
                        <span className="h-4 w-4 shrink-0" />
                      )}
                      <span className="truncate">{UNCATEGORIZED_CATEGORY_LABEL}</span>
                    </span>
                    <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
                      {uncategorizedCount}
                    </span>
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-1 sm:flex-row sm:items-center sm:justify-end">
            <BookshelfActionButton
              type="button"
              actionVariant="glass"
              active={batchMode}
              onClick={handleBatchModeToggle}
            >
              {batchMode ? (
                <X className="mr-2 h-4 w-4" />
              ) : (
                <CheckSquare className="mr-2 h-4 w-4" />
              )}
              {batchMode ? "完成" : "批量管理"}
            </BookshelfActionButton>
            <SearchBar
              onSearch={setSearchQuery}
              className="w-full sm:min-w-[200px] sm:max-w-sm"
            />
          </div>
        </div>

        {batchMode ? (
          <div className="surface-glass surface-elevated mb-6 flex flex-col gap-3 rounded-2xl px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Tags className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">
                  已选择 {selectedBookCount} 本书
                </p>
                <p className="text-[11px] font-medium text-muted-foreground">
                  点击书籍封面或选择按钮切换选中状态
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <BookshelfActionButton
                type="button"
                actionVariant="panelGhost"
                disabled={selectedBookCount === 0}
                onClick={handleClearSelectedBooks}
              >
                清空选择
              </BookshelfActionButton>
              <BookshelfActionButton
                type="button"
                actionVariant="panelGhost"
                disabled={selectedBookCount === 0}
                className="text-red-500 hover:bg-red-500/10 hover:text-red-600"
                onClick={() => handleOpenBatchDeleteDialog(selectedBookIdList)}
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                批量删除
              </BookshelfActionButton>
              <BookshelfActionButton
                type="button"
                actionVariant="panelPrimary"
                disabled={selectedBookCount === 0}
                onClick={() => handleOpenBatchCategoryDialog(selectedBookIdList)}
              >
                <Tags className="mr-2 h-3.5 w-3.5" />
                设置分类
              </BookshelfActionButton>
            </div>
          </div>
        ) : null}

        {/* Book Grid */}
        {loading && page === 1 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {Array.from({ length: skeletonCount }).map((_, i) => (
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
              selectionMode={batchMode}
              selectedBookIds={selectedBookIds}
              emptyTitle={activeCategoryName ? "这个分类还没有书" : undefined}
              emptyDescription={activeCategoryName ? "可以从其他图书的菜单中设置分类，或切回全部书籍继续浏览。" : undefined}
              onDelete={handleRequestDelete}
              onChangeCategory={handleOpenCategoryDialog}
              onToggleSelect={handleToggleBookSelect}
            />
            
            {/* Load More Trigger & Indicator */}
            <div 
              ref={loadMoreRef} 
              className="mt-12 flex flex-col items-center justify-center gap-3 py-6"
            >
              {hasMore ? (
                <BookshelfActionButton
                  actionVariant="loadMore"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      <span>正在加载...</span>
                    </div>
                  ) : (
                    "加载更多"
                  )}
                </BookshelfActionButton>
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

      {batchCategoryDialogOpen ? (
        <BatchBookCategoryDialog
          open={batchCategoryDialogOpen}
          selectedCount={selectedBookCount}
          categories={categories}
          categoryInput={batchCategoryInput}
          savingCategory={savingBatchCategory}
          onCategoryInputChange={setBatchCategoryInput}
          onOpenChange={handleBatchCategoryDialogOpenChange}
          onSave={handleSaveBatchCategory}
        />
      ) : null}

      {batchDeleteDialogOpen ? (
        <BatchBookDeleteDialog
          open={batchDeleteDialogOpen}
          selectedCount={selectedBookCount}
          deletingBooks={deletingBooks}
          onConfirm={confirmBatchDelete}
          onOpenChange={handleBatchDeleteDialogOpenChange}
        />
      ) : null}
    </div>
  );
}
