"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

interface UseBatchBookDeleteActionParams {
  onDeleted: (bookIds: string[]) => void;
}

export function useBatchBookDeleteAction({
  onDeleted,
}: UseBatchBookDeleteActionParams) {
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);
  const [deletingBooks, setDeletingBooks] = useState(false);
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);

  const openBatchDeleteDialog = useCallback((bookIds: string[]) => {
    setSelectedBookIds(bookIds);
    setBatchDeleteDialogOpen(true);
  }, []);

  const confirmBatchDelete = useCallback(async () => {
    if (selectedBookIds.length === 0) return;

    setDeletingBooks(true);
    try {
      const res = await fetch("/api/books/batch-delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bookIds: selectedBookIds }),
      });

      if (res.ok) {
        onDeleted(selectedBookIds);
        setBatchDeleteDialogOpen(false);
        toast.success(`成功删除 ${selectedBookIds.length} 本书`);
      } else {
        const error = await res.json();
        toast.error(error.message || "删除失败");
      }
    } catch {
      toast.error("网络错误，删除失败");
    } finally {
      setDeletingBooks(false);
    }
  }, [selectedBookIds, onDeleted]);

  const handleBatchDeleteDialogOpenChange = useCallback((open: boolean) => {
    if (open) {
      setBatchDeleteDialogOpen(true);
    } else if (!deletingBooks) {
      setBatchDeleteDialogOpen(false);
    }
  }, [deletingBooks]);

  return {
    batchDeleteDialogOpen,
    confirmBatchDelete,
    deletingBooks,
    handleBatchDeleteDialogOpenChange,
    openBatchDeleteDialog,
  };
}
