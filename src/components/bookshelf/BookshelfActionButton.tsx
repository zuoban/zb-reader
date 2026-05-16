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
  glass: "liquid-control h-10 rounded-full px-4 text-[13px] font-bold",
  filter: "category-filter-shell h-11 w-full justify-between rounded-full px-4 text-[14px] font-semibold sm:w-56 sm:min-w-56",
  panelGhost: "h-9 rounded-full px-4 text-xs font-bold",
  panelPrimary: "h-9 rounded-full px-4 text-xs font-bold",
  loadMore: "liquid-control h-12 min-w-[160px] rounded-full px-8 text-sm font-medium shadow-sm",
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
