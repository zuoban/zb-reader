"use client";

import { useEffect, useMemo } from "react";
import type { MutableRefObject, RefObject } from "react";
import { debounce } from "@/lib/utils";

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
  const handleScroll = useMemo(() => {
    return debounce((epubContainer: HTMLElement) => {
      const scrollRange = epubContainer.scrollHeight - epubContainer.clientHeight;
      if (scrollRange <= 0) return;

      const ratio = Math.min(1, Math.max(0, epubContainer.scrollTop / scrollRange));
      scrollRatioRef.current = ratio;

      if (!currentLocationRef.current) return;

      onLocationChange?.({
        cfi: currentLocationRef.current,
        progress: progressRef.current,
        scrollRatio: ratio,
        href: undefined,
      });
    }, 300);
  }, [currentLocationRef, onLocationChange, progressRef, scrollRatioRef]);

  useEffect(() => {
    if (!isRenditionReady) return;

    const epubContainer = viewerRef.current?.querySelector(
      ".epub-container"
    ) as HTMLElement | null;
    if (!epubContainer) return;

    const scrollListener = () => handleScroll(epubContainer);

    epubContainer.addEventListener("scroll", scrollListener, { passive: true });

    return () => {
      epubContainer.removeEventListener("scroll", scrollListener);
    };
  }, [isRenditionReady, viewerRef, handleScroll]);
}
