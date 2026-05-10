"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { Book } from "@/lib/db/schema";

interface UseBookDeleteActionParams {
  books: Book[];
  onDeleted: (bookId: string) => void;
}

export function useBookDeleteAction({
  books,
  onDeleted,
}: UseBookDeleteActionParams) {
  const [deleteDialogBook, setDeleteDialogBook] = useState<Book | null>(null);
  const [deletingBook, setDeletingBook] = useState(false);

  const requestDelete = useCallback((bookId: string) => {
    const book = books.find((item) => item.id === bookId);
    if (book) {
      setDeleteDialogBook(book);
    }
  }, [books]);

  const confirmDelete = useCallback(async () => {
    if (!deleteDialogBook) return;

    setDeletingBook(true);
    try {
      const res = await fetch(`/api/books/${deleteDialogBook.id}`, { method: "DELETE" });
      if (res.ok) {
        onDeleted(deleteDialogBook.id);
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
  }, [deleteDialogBook, onDeleted]);

  const handleDeleteDialogOpenChange = useCallback((open: boolean) => {
    if (!open && !deletingBook) {
      setDeleteDialogBook(null);
    }
  }, [deletingBook]);

  return {
    confirmDelete,
    deleteDialogBook,
    deletingBook,
    handleDeleteDialogOpenChange,
    requestDelete,
  };
}
