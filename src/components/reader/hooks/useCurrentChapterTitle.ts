"use client";

import { useMemo } from "react";
import type { TocItem } from "@/types/reader";

function normalizeTocHref(href?: string) {
  if (!href) return "";
  return href.split("#")[0]?.trim().toLowerCase() ?? "";
}

function findCurrentChapterTitle(
  items: TocItem[],
  currentHref?: string
): string | undefined {
  const targetHref = normalizeTocHref(currentHref);
  if (!targetHref) return undefined;

  for (const item of items) {
    const itemHref = normalizeTocHref(item.href);
    if (itemHref === targetHref || (itemHref && targetHref.startsWith(itemHref))) {
      return item.label;
    }

    if (item.subitems?.length) {
      const nestedMatch = findCurrentChapterTitle(item.subitems, currentHref);
      if (nestedMatch) return nestedMatch;
    }
  }

  return undefined;
}

export function useCurrentChapterTitle(
  toc: TocItem[],
  currentHref: string | undefined,
  fallbackTitle: string | undefined
) {
  return useMemo(
    () => findCurrentChapterTitle(toc, currentHref) ?? fallbackTitle,
    [currentHref, fallbackTitle, toc]
  );
}
