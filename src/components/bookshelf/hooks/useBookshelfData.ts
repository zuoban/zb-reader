"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Book } from "@/lib/db/schema";

export const ALL_CATEGORY = "__all__";

export interface CategorySummary {
  name: string;
  count: number;
}

export interface BookshelfInitialData {
  books: Book[];
  categories: CategorySummary[];
  progressMap: Record<string, number>;
  lastReadAtMap: Record<string, string>;
  theme: "light" | "dark";
  total: number;
  allTotal: number;
  page: number;
  limit: number;
}

export function useBookshelfData(initialData: BookshelfInitialData) {
  const [books, setBooks] = useState<Book[]>(initialData.books);
  const [categories, setCategories] = useState<CategorySummary[]>(initialData.categories);
  const [totalBooks, setTotalBooks] = useState(initialData.allTotal);
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORY);
  const [searchQuery, setSearchQuery] = useState("");
  const [progressMap, setProgressMap] = useState<Record<string, number>>(initialData.progressMap);
  const [lastReadAtMap, setLastReadAtMap] = useState<Record<string, string>>(initialData.lastReadAtMap);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(initialData.page);
  const [hasMore, setHasMore] = useState(initialData.books.length < initialData.total);
  const activeCategoryName = selectedCategory === ALL_CATEGORY ? "" : selectedCategory;
  const fetchAbortRef = useRef<AbortController | null>(null);

  const fetchBooks = useCallback(async (currentPage = 1) => {
    if (currentPage === 1) {
      fetchAbortRef.current?.abort();
      fetchAbortRef.current = new AbortController();
    }
    const signal = currentPage === 1 ? fetchAbortRef.current?.signal : undefined;

    try {
      const params = new URLSearchParams();
      params.set("withProgress", "true");
      params.set("page", currentPage.toString());
      params.set("limit", "20");
      params.set("includeFacets", currentPage === 1 ? "true" : "false");
      if (activeCategoryName) {
        params.set("category", activeCategoryName);
      }
      if (searchQuery) {
        params.set("search", searchQuery);
      }

      const res = await fetch(`/api/books?${params}`, { signal });
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

        if (currentPage === 1) {
          setCategories(data.categories || []);
          setTotalBooks(data.allTotal ?? data.total ?? 0);
        }

        const totalFetched = (currentPage - 1) * 20 + data.books.length;
        setHasMore(totalFetched < (data.total || 0));
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      toast.error("获取书籍失败");
    } finally {
      if (fetchAbortRef.current?.signal === signal) {
        fetchAbortRef.current = null;
      }
      setLoading(false);
      setLoadingMore(false);
    }
  }, [activeCategoryName, searchQuery]);

  useEffect(() => {
    return () => {
      fetchAbortRef.current?.abort();
    };
  }, []);

  const didMountRef = useRef(false);
  const queryResetRef = useRef(false);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    queryResetRef.current = true;
    setPage(1);
    setBooks([]);
    setProgressMap({});
    setLastReadAtMap({});
    setLoading(true);
    void fetchBooks(1).finally(() => {
      queryResetRef.current = false;
    });
  }, [activeCategoryName, fetchBooks, searchQuery]);

  useEffect(() => {
    if (page === 1) return;
    if (queryResetRef.current) return;
    void fetchBooks(page);
  }, [fetchBooks, page]);

  useEffect(() => {
    const handleCategoriesChanged = () => {
      setPage(1);
      fetchBooks(1);
    };

    window.addEventListener("categories-changed", handleCategoriesChanged);
    return () => {
      window.removeEventListener("categories-changed", handleCategoriesChanged);
    };
  }, [fetchBooks]);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      setLoadingMore(true);
      setPage((p) => p + 1);
    }
  }, [hasMore, loadingMore]);

  const refreshBooks = useCallback(async () => {
    setPage(1);
    await fetchBooks(1);
  }, [fetchBooks]);

  const removeBook = useCallback((bookId: string) => {
    setBooks((prev) => prev.filter((book) => book.id !== bookId));
    setProgressMap((prev) => {
      const next = { ...prev };
      delete next[bookId];
      return next;
    });
    setLastReadAtMap((prev) => {
      const next = { ...prev };
      delete next[bookId];
      return next;
    });
  }, []);

  return {
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
    searchQuery,
    selectedCategory,
    setSearchQuery,
    setSelectedCategory,
    totalBooks,
  };
}
