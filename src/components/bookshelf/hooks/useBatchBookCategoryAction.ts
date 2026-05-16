"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

interface UseBatchBookCategoryActionParams {
  onSaved: () => Promise<void> | void;
}

export function useBatchBookCategoryAction({ onSaved }: UseBatchBookCategoryActionParams) {
  const [batchCategoryDialogOpen, setBatchCategoryDialogOpen] = useState(false);
  const [batchCategoryInput, setBatchCategoryInput] = useState("");
  const [savingBatchCategory, setSavingBatchCategory] = useState(false);
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);

  const openBatchCategoryDialog = useCallback((bookIds: string[]) => {
    setSelectedBookIds(bookIds);
    setBatchCategoryInput("");
    setBatchCategoryDialogOpen(true);
  }, []);

  const handleBatchCategoryDialogOpenChange = useCallback((open: boolean) => {
    setBatchCategoryDialogOpen(open);
    if (!open) {
      setBatchCategoryInput("");
    }
  }, []);

  const clearSelectedBookIds = useCallback(() => {
    setSelectedBookIds([]);
  }, []);

  const saveBatchCategory = useCallback(async () => {
    if (selectedBookIds.length === 0) {
      toast.error("请选择要设置分类的书籍");
      return;
    }

    const nextCategory = batchCategoryInput.trim();
    if (nextCategory.length > 40) {
      toast.error("分类名称不能超过 40 个字符");
      return;
    }

    setSavingBatchCategory(true);
    try {
      const res = await fetch("/api/books/batch-category", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookIds: selectedBookIds, category: nextCategory }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data.error || "分类保存失败");
        return;
      }

      const updatedCount = Number(data.updatedCount || selectedBookIds.length);
      setBatchCategoryDialogOpen(false);
      setBatchCategoryInput("");
      setSelectedBookIds([]);
      await onSaved();
      toast.success(nextCategory ? `已更新 ${updatedCount} 本书的分类` : `已清除 ${updatedCount} 本书的分类`);
    } catch {
      toast.error("分类保存失败");
    } finally {
      setSavingBatchCategory(false);
    }
  }, [batchCategoryInput, onSaved, selectedBookIds]);

  return {
    batchCategoryDialogOpen,
    batchCategoryInput,
    clearSelectedBookIds,
    handleBatchCategoryDialogOpenChange,
    openBatchCategoryDialog,
    saveBatchCategory,
    savingBatchCategory,
    selectedBookIds,
    setBatchCategoryInput,
  };
}
