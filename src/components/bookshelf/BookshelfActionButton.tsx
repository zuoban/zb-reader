"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

type BookshelfActionButtonVariant = "glass" | "filter" | "panelGhost" | "panelPrimary" | "loadMore";

interface BookshelfActionButtonProps extends Omit<ComponentProps<typeof Button>, "variant"> {
  actionVariant?: BookshelfActionButtonVariant;
  active?: boolean;
}

const actionButtonClasses: Record<BookshelfActionButtonVariant, string> = {
  glass: "liquid-control h-10 rounded-lg px-3.5 text-sm font-medium",
  filter: "category-filter-shell h-10 w-full justify-between rounded-lg px-3.5 text-sm font-medium sm:w-52 sm:min-w-52",
  panelGhost: "h-8 rounded-lg px-3 text-xs font-medium hover:bg-muted",
  panelPrimary: "h-8 rounded-lg px-3 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90",
  loadMore: "liquid-control h-10 min-w-[140px] rounded-lg px-6 text-sm font-medium",
};

const actionButtonVariants: Record<BookshelfActionButtonVariant, ComponentProps<typeof Button>["variant"]> = {
  glass: "outline",
  filter: "outline",
  panelGhost: "ghost",
  panelPrimary: "default",
  loadMore: "outline",
};

export function BookshelfActionButton({
  actionVariant = "glass",
  active = false,
  className,
  ...props
}: BookshelfActionButtonProps) {
  return (
    <Button
      {...props}
      variant={actionButtonVariants[actionVariant]}
      className={cn(
        "bookshelf-action-button cursor-pointer",
        actionButtonClasses[actionVariant],
        active && "batch-mode-toggle-active",
        className
      )}
    />
  );
}
