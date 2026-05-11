"use client";

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

interface BookDeleteDialogProps {
  bookTitle?: string;
  deletingBook: boolean;
  open: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}

export function BookDeleteDialog({
  bookTitle,
  deletingBook,
  open,
  onConfirm,
  onOpenChange,
}: BookDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>删除这本书？</AlertDialogTitle>
          <AlertDialogDescription>
            将从书架中移除《{bookTitle || "未命名书籍"}》及其本地文件。此操作无法撤销。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deletingBook}>取消</AlertDialogCancel>
          <AlertDialogAction
            className="border-destructive/30 bg-destructive/90 text-white hover:bg-destructive focus-visible:ring-destructive/20"
            disabled={deletingBook}
            onClick={onConfirm}
          >
            删除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
