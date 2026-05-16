"use client";

import { Trash2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface BatchBookDeleteDialogProps {
  selectedCount: number;
  deletingBooks: boolean;
  open: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}

export function BatchBookDeleteDialog({
  selectedCount,
  deletingBooks,
  open,
  onConfirm,
  onOpenChange,
}: BatchBookDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="liquid-panel overflow-hidden border-none p-0 sm:max-w-md shadow-2xl" showCloseButton={false}>
        <div className="absolute inset-0 bg-background/60 backdrop-blur-3xl -z-10" />
        <div className="liquid-hairline absolute inset-x-5 top-0 h-px opacity-40" />

        <div className="flex flex-col relative">
          <div className="px-6 pt-8 pb-5">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-500/15 text-red-500 shadow-sm border border-red-500/10">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                    批量删除书籍？
                  </DialogTitle>
                  <DialogDescription className="mt-0.5 text-[10px] font-black tracking-[0.2em] text-red-500/60 uppercase">
                    Irreversible Action
                  </DialogDescription>
                </div>
              </div>
              <p className="mt-5 text-[13px] font-medium leading-relaxed text-foreground/80">
                将从书架中移除选中的 {selectedCount} 本书及其本地文件。此操作无法撤销。
              </p>
            </DialogHeader>
          </div>

          <div className="flex items-center justify-end gap-3 p-6 pt-4">
            <Button
              type="button"
              variant="ghost"
              className="h-11 min-w-[100px] cursor-pointer rounded-xl text-foreground/60 hover:bg-background/60 hover:text-foreground px-6 text-[11px] font-black tracking-[0.2em] uppercase transition-all active:scale-95"
              disabled={deletingBooks}
              onClick={() => onOpenChange(false)}
            >
              <X className="mr-2 h-3.5 w-3.5" />
              取消
            </Button>
            <Button
              type="button"
              className="h-11 min-w-[100px] cursor-pointer rounded-xl bg-red-500 text-white shadow-[0_8px_16px_-6px_rgba(239,68,68,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] hover:bg-red-600 hover:shadow-[0_12px_20px_-6px_rgba(239,68,68,0.4)] px-6 text-[11px] font-black tracking-[0.2em] uppercase transition-all active:scale-95"
              disabled={deletingBooks}
              onClick={onConfirm}
            >
              确认删除
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
