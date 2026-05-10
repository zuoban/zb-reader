"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { Book } from "@/lib/db/schema";

interface UseBookCategoryActionParams {
  onSaved: () => Promise<void> | void;
}

export function useBookCategoryAction({ onSaved }: UseBookCategoryActionParams) {
  const [categoryDialogBook, setCategoryDialogBook] = useState<Book | null>(null);
  const [categoryInput, setCategoryInput] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);

  const openCategoryDialog = useCallback((book: Book) => {
    setCategoryDialogBook(book);
    setCategoryInput(book.category || "");
  }, []);

  const handleCategoryDialogOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setCategoryDialogBook(null);
      setCategoryInput("");
    }
  }, []);

  const saveCategory = useCallback(async () => {
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
      await onSaved();
      toast.success(nextCategory ? "分类已更新" : "分类已清除");
    } catch {
      toast.error("分类保存失败");
    } finally {
      setSavingCategory(false);
    }
  }, [categoryDialogBook, categoryInput, onSaved]);

  return {
    categoryDialogBook,
    categoryInput,
    handleCategoryDialogOpenChange,
    openCategoryDialog,
    saveCategory,
    savingCategory,
    setCategoryInput,
  };
}
