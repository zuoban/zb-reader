"use client";

import { Check, Loader2, Tags } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { CategorySummary } from "@/components/bookshelf/hooks/useBookshelfData";

interface BatchBookCategoryDialogProps {
  open: boolean;
  selectedCount: number;
  categories: CategorySummary[];
  categoryInput: string;
  savingCategory: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  onCategoryInputChange: (value: string) => void;
}

export function BatchBookCategoryDialog({
  open,
  selectedCount,
  categories,
  categoryInput,
  savingCategory,
  onOpenChange,
  onSave,
  onCategoryInputChange,
}: BatchBookCategoryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="liquid-panel overflow-hidden border-none p-0 shadow-2xl sm:max-w-md">
        <div className="absolute inset-0 -z-10 bg-background/60 backdrop-blur-3xl" />
        <div className="liquid-hairline absolute inset-x-5 top-0 h-px opacity-40" />

        <div className="relative flex flex-col">
          <div className="px-6 pb-5 pt-8">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/10 bg-primary/20 text-primary shadow-sm">
                  <Tags className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                    批量设置分类
                  </DialogTitle>
                  <DialogDescription className="mt-0.5 text-[10px] font-black tracking-[0.2em] text-primary/60 uppercase">
                    Batch Organize
                  </DialogDescription>
                </div>
              </div>
              <p className="mt-5 text-[13px] font-medium leading-relaxed text-foreground/80">
                为已选择的 {selectedCount} 本书设置同一个书架分类。
              </p>
            </DialogHeader>
          </div>

          <div className="space-y-6 px-6">
            <div className="grid gap-2.5">
              <Label htmlFor="batch-book-category" className="pl-1 text-[11px] font-black tracking-widest text-foreground/40 uppercase">
                分类名称
              </Label>
              <Input
                id="batch-book-category"
                value={categoryInput}
                maxLength={40}
                placeholder="例如：小说、技术、历史"
                className="h-11 rounded-xl border-none bg-background/40 pl-4 pr-4 text-sm font-bold text-foreground shadow-inner focus-visible:ring-1 focus-visible:ring-primary/40"
                onChange={(event) => onCategoryInputChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    onSave();
                  }
                }}
              />
              <p className="pl-1 text-[11px] font-medium text-foreground/40">
                留空保存即可清除所选书籍分类。
              </p>
            </div>

            {categories.length > 0 ? (
              <div className="grid gap-2.5">
                <Label className="pl-1 text-[11px] font-black tracking-widest text-foreground/40 uppercase">
                  已有分类
                </Label>
                <div className="relative overflow-hidden rounded-2xl border border-border/30 bg-background/40 shadow-inner">
                  <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto bg-muted/5 p-3 [scrollbar-width:thin]">
                    {categories.map((category) => {
                      const isSelected = categoryInput.trim() === category.name;

                      return (
                        <Button
                          key={category.name}
                          type="button"
                          variant="ghost"
                          className={cn(
                            "h-8 cursor-pointer rounded-lg border px-3 text-xs font-bold transition-all",
                            isSelected
                              ? "scale-105 border-primary bg-primary text-primary-foreground shadow-sm"
                              : "border-border/20 bg-background/50 text-foreground/60 hover:border-primary/20 hover:bg-primary/10 hover:text-primary"
                          )}
                          onClick={() => onCategoryInputChange(category.name)}
                        >
                          {isSelected ? <Check className="mr-1.5 h-3 w-3" /> : <Tags className="mr-1.5 h-3 w-3 opacity-40" />}
                          <span className="max-w-28 truncate">{category.name}</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex justify-end p-6 pt-8">
            <Button
              type="button"
              className="h-11 min-w-[140px] cursor-pointer rounded-xl bg-primary px-8 text-[11px] font-black tracking-[0.25em] text-primary-foreground uppercase shadow-[0_8px_16px_-6px_rgba(var(--primary-rgb),0.3),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all hover:bg-primary/90 hover:shadow-[0_12px_20px_-6px_rgba(var(--primary-rgb),0.4)] active:scale-95"
              disabled={savingCategory || selectedCount === 0}
              onClick={onSave}
            >
              {savingCategory ? (
                <Loader2 className="mr-2.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="mr-2.5 h-3.5 w-3.5 stroke-[3px]" />
              )}
              保存更改
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
