"use client";

import { useState, useEffect, useCallback } from "react";
import { Edit2, Loader2, Tags, Trash2, X, Check } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

interface Category {
  name: string;
  count: number;
}

interface CategoryManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CategoryManagerDialog({
  open,
  onOpenChange,
}: CategoryManagerDialogProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [newNameInput, setNewNameInput] = useState("");
  const [deletingCategory, setDeletingCategory] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      if (res.ok) {
        setCategories(data.categories);
      }
    } catch {
      toast.error("获取分类失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchCategories();
    }
  }, [open, fetchCategories]);

  const handleRename = async (oldName: string) => {
    const nextName = newNameInput.trim();
    if (!nextName || nextName === oldName) {
      setEditingName(null);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldName, newName: nextName }),
      });

      if (res.ok) {
        toast.success("重命名成功");
        setEditingName(null);
        await fetchCategories();
        // 通知其他组件分类已更改
        window.dispatchEvent(new CustomEvent("categories-changed"));
      } else {
        const data = await res.json();
        toast.error(data.error || "重命名失败");
      }
    } catch {
      toast.error("重命名失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCategory) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/categories?name=${encodeURIComponent(deletingCategory)}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("分类已删除");
        setDeletingCategory(null);
        await fetchCategories();
        window.dispatchEvent(new CustomEvent("categories-changed"));
      } else {
        toast.error("删除失败");
      }
    } catch {
      toast.error("删除失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="liquid-panel overflow-hidden border-none p-0 sm:max-w-md shadow-2xl">
          {/* 增加背景阻尼感，确保文字清晰 */}
          <div className="absolute inset-0 bg-background/60 backdrop-blur-3xl -z-10" />
          <div className="liquid-hairline absolute inset-x-5 top-0 h-px opacity-40" />
          
          <div className="flex flex-col relative z-10">
            {/* Header Section */}
            <div className="px-6 pt-8 pb-5">
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/20 text-primary shadow-sm border border-primary/10">
                    <Tags className="h-5 w-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                      分类管理
                    </DialogTitle>
                    <DialogDescription className="mt-0.5 text-[10px] font-black tracking-[0.2em] text-primary/60 uppercase">
                      Category Management
                    </DialogDescription>
                  </div>
                </div>
                <p className="mt-5 text-[13px] font-medium leading-relaxed text-foreground/80">
                  管理您的书架分类。重命名将同步更新所有相关书籍，删除分类不会影响书籍文件。
                </p>
              </DialogHeader>
            </div>

            {/* List Section */}
            <div className="relative mx-4 mb-2 overflow-hidden rounded-2xl border border-border/30 bg-background/40 shadow-inner">
              <div className="flex max-h-[320px] flex-col overflow-y-auto [scrollbar-width:thin] bg-muted/5">
                {loading ? (
                  <div className="flex min-h-[160px] items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary/60" />
                  </div>
                ) : categories.length === 0 ? (
                  <div className="flex min-h-[160px] flex-col items-center justify-center gap-3 opacity-30">
                    <Tags className="h-10 w-10 stroke-[1px]" />
                    <p className="text-xs font-black tracking-widest uppercase">
                      NO CATEGORIES
                    </p>
                  </div>
                ) : (
                  categories.map((category, index) => (
                    <div
                      key={category.name}
                      className={cn(
                        "group flex items-center justify-between gap-4 px-4 py-4 transition-colors hover:bg-primary/[0.04]",
                        index !== categories.length - 1 && "border-b border-border/10"
                      )}
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        {editingName === category.name ? (
                          <div className="relative flex-1">
                            <Input
                              autoFocus
                              value={newNameInput}
                              maxLength={40}
                              className="h-10 border-none bg-primary/10 pl-3 pr-10 text-sm font-bold text-foreground focus-visible:ring-1 focus-visible:ring-primary/40"
                              onChange={(e) => setNewNameInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleRename(category.name);
                                if (e.key === "Escape") setEditingName(null);
                              }}
                            />
                            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                                disabled={submitting}
                                onClick={() => handleRename(category.name)}
                              >
                                {submitting ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Check className="h-3.5 w-3.5" />
                                )}
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 rounded-md bg-muted text-muted-foreground hover:bg-muted/80"
                                onClick={() => setEditingName(null)}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="h-2 w-2 shrink-0 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.4)]" />
                            <span className="truncate text-sm font-bold tracking-tight text-foreground">
                              {category.name}
                            </span>
                            <span className="shrink-0 rounded-md bg-primary/20 px-2 py-0.5 text-[10px] font-black tracking-tighter text-primary">
                              {category.count}
                            </span>
                          </div>
                        )}
                      </div>

                      {editingName !== category.name && (
                        <div className="flex shrink-0 items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-lg bg-background/50 border border-border/20 text-foreground/60 hover:bg-primary/10 hover:text-primary hover:border-primary/20 transition-all"
                            onClick={() => {
                              setEditingName(category.name);
                              setNewNameInput(category.name);
                            }}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-lg bg-background/50 border border-border/20 text-destructive/60 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 transition-all"
                            onClick={() => setDeletingCategory(category.name)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ) )
                )}
              </div>
            </div>

            {/* Footer Section */}
            <div className="flex justify-end p-6 pt-2">
              <Button 
                variant="ghost" 
                className="h-11 cursor-pointer rounded-xl px-8 text-xs font-black tracking-[0.2em] text-foreground/70 hover:bg-muted hover:text-foreground active:scale-95 transition-all uppercase" 
                onClick={() => onOpenChange(false)}
              >
                关闭
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deletingCategory}
        onOpenChange={(open) => !open && setDeletingCategory(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除分类</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除分类“{deletingCategory}”吗？该分类下的书籍将被设为“未分类”。此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={submitting}
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
            >
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
