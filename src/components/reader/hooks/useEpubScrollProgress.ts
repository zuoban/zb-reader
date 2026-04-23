"use client";

import { useEffect } from "react";
import type { MutableRefObject, RefObject } from "react";

interface UseEpubScrollProgressParams {
  currentLocationRef: MutableRefObject<string | null>;
  isRenditionReady: boolean;
  onLocationChange?: (location: {
    cfi: string;
    progress: number;
    currentPage?: number;
    totalPages?: number;
    href?: string;
    scrollRatio?: number;
  }) => void;
  progressRef: MutableRefObject<number>;
  scrollRatioRef: MutableRefObject<number>;
  viewerRef: RefObject<HTMLDivElement | null>;
}

export function useEpubScrollProgress({
  currentLocationRef,
  isRenditionReady,
  onLocationChange,
  progressRef,
  scrollRatioRef,
  viewerRef,
}: UseEpubScrollProgressParams) {
  useEffect(() => {
    if (!isRenditionReady) return;

    const epubContainer = viewerRef.current?.querySelector(
      ".epub-container"
    ) as HTMLElement | null;
    if (!epubContainer) return;

    let scrollTimer: ReturnType<typeof setTimeout> | null = null;

    const readScrollRatio = () => {
      const scrollRange = epubContainer.scrollHeight - epubContainer.clientHeight;
      if (scrollRange <= 0) return undefined;

      const ratio = Math.min(1, Math.max(0, epubContainer.scrollTop / scrollRange));
      scrollRatioRef.current = ratio;
      return ratio;
    };

    const handleScroll = () => {
      readScrollRatio();

      if (scrollTimer !== null) clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        scrollTimer = null;
        if (!currentLocationRef.current) return;

        onLocationChange?.({
          cfi: currentLocationRef.current,
          progress: progressRef.current,
          scrollRatio: readScrollRatio(),
          href: undefined,
        });
      }, 300);
    };

    epubContainer.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      epubContainer.removeEventListener("scroll", handleScroll);
      if (scrollTimer !== null) clearTimeout(scrollTimer);
    };
  }, [
    currentLocationRef,
    isRenditionReady,
    onLocationChange,
    progressRef,
    scrollRatioRef,
    viewerRef,
  ]);
}
