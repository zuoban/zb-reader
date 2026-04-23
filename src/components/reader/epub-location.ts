import type { Book } from "epubjs";

export interface EpubRelocatedLocation {
  start: {
    cfi: string;
    percentage: number;
    displayed: { page: number; total: number };
    href: string;
  };
  end?: {
    cfi: string;
    href: string;
  };
}

export interface ReaderLocationChange {
  cfi: string;
  progress: number;
  currentPage?: number;
  totalPages?: number;
  href?: string;
  scrollRatio?: number;
}

export function readEpubScrollRatio(container: HTMLElement | null) {
  if (!container) return undefined;

  const scrollRange = container.scrollHeight - container.clientHeight;
  if (scrollRange <= 0) return undefined;

  return Math.min(1, Math.max(0, container.scrollTop / scrollRange));
}

export function calculateOverallProgress(
  book: Book | null,
  href: string | undefined,
  epubContainer: HTMLElement | null
) {
  if (!book || !book.spine || !href) {
    return 0;
  }

  const spineItems =
    (book.spine as unknown as { items: Array<{ href: string; index: number }> })
      .items || [];
  const totalSpineItems = spineItems.length;

  if (totalSpineItems <= 0) {
    return 0;
  }

  const currentItem = spineItems.find((item) => item.href === href);
  if (!currentItem) {
    return 0;
  }

  const chapterProgress = readEpubScrollRatio(epubContainer) ?? 0;
  return Math.min(
    1,
    Math.max(0, (currentItem.index + chapterProgress) / totalSpineItems)
  );
}
