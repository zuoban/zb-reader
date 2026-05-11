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
import type { Book } from "@/lib/db/schema";
import type { CategorySummary } from "@/components/bookshelf/hooks/useBookshelfData";

interface BookCategoryDialogProps {
  book: Book;
  categories: CategorySummary[];
  categoryInput: string;
  savingCategory: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  onCategoryInputChange: (value: string) => void;
}

export function BookCategoryDialog({
  book,
  categories,
  categoryInput,
  savingCategory,
  onOpenChange,
  onSave,
  onCategoryInputChange,
}: BookCategoryDialogProps) {
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="liquid-panel overflow-hidden border-none p-0 sm:max-w-md shadow-2xl">
        <div className="absolute inset-0 bg-background/60 backdrop-blur-3xl -z-10" />
        <div className="liquid-hairline absolute inset-x-5 top-0 h-px opacity-40" />

        <div className="flex flex-col relative">
          <div className="px-6 pt-8 pb-5">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/20 text-primary shadow-sm border border-primary/10">
                  <Tags className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                    设置分类
                  </DialogTitle>
                  <DialogDescription className="mt-0.5 text-[10px] font-black tracking-[0.2em] text-primary/60 uppercase">
                    Organize Book
                  </DialogDescription>
                </div>
              </div>
              <p className="mt-5 text-[13px] font-medium leading-relaxed text-foreground/80">
                为《{book.title || "未命名书籍"}》设置一个书架分类。
              </p>
            </DialogHeader>
          </div>

          <div className="px-6 space-y-6">
            <div className="grid gap-2.5">
              <Label htmlFor="book-category" className="text-[11px] font-black tracking-widest text-foreground/40 uppercase pl-1">
                分类名称
              </Label>
              <div className="relative">
                <Input
                  id="book-category"
                  value={categoryInput}
                  maxLength={40}
                  placeholder="例如：小说、技术、历史"
                  className="h-11 border-none bg-background/40 pl-4 pr-4 text-sm font-bold text-foreground shadow-inner focus-visible:ring-1 focus-visible:ring-primary/40 rounded-xl"
                  onChange={(event) => onCategoryInputChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      onSave();
                    }
                  }}
                />
              </div>
              <p className="pl-1 text-[11px] font-medium text-foreground/40">
                留空保存即可清除分类。
              </p>
            </div>

            {categories.length > 0 ? (
              <div className="grid gap-2.5">
                <Label className="text-[11px] font-black tracking-widest text-foreground/40 uppercase pl-1">
                  已有分类
                </Label>
                <div className="relative overflow-hidden rounded-2xl border border-border/30 bg-background/40 shadow-inner">
                  <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto p-3 [scrollbar-width:thin] bg-muted/5">
                    {categories.map((category) => {
                      const isSelected = categoryInput.trim() === category.name;

                      return (
                        <Button
                          key={category.name}
                          type="button"
                          variant="ghost"
                          className={cn(
                            "h-8 cursor-pointer rounded-lg px-3 text-xs font-bold transition-all border",
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary shadow-sm scale-105"
                              : "bg-background/50 text-foreground/60 border-border/20 hover:bg-primary/10 hover:text-primary hover:border-primary/20"
                          )}
                          onClick={() => onCategoryInputChange(category.name)}
                        >
                          {isSelected ? <Check className="h-3 w-3 mr-1.5" /> : <Tags className="h-3 w-3 mr-1.5 opacity-40" />}
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
              className="h-11 min-w-[140px] cursor-pointer rounded-xl bg-primary text-primary-foreground shadow-[0_8px_16px_-6px_rgba(var(--primary-rgb),0.3),inset_0_1px_0_rgba(255,255,255,0.2)] hover:bg-primary/90 hover:shadow-[0_12px_20px_-6px_rgba(var(--primary-rgb),0.4)] px-8 text-[11px] font-black tracking-[0.25em] uppercase transition-all active:scale-95"
              disabled={savingCategory}
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
