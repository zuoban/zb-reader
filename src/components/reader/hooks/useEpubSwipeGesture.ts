"use client";

import { useCallback, useEffect, useRef } from "react";
import type { MutableRefObject } from "react";
import type { Rendition } from "epubjs";

interface UseEpubSwipeGestureParams {
  isRenditionReady: boolean;
  renditionRef: MutableRefObject<Rendition | null>;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  hasPrevChapter: boolean;
  hasNextChapter: boolean;
  enabled?: boolean;
}

const SWIPE_THRESHOLD = 50;
const DIRECTION_LOCK_THRESHOLD = 10;

/**
 * Detects left/right swipe gestures on the EPUB reader and triggers chapter navigation.
 *
 * Works by listening to touch events from both:
 * 1. epubjs rendition events (covers iframe content area)
 * 2. Document touch events (covers non-iframe areas like margins)
 *
 * Swipe left (deltaX < 0) → next chapter
 * Swipe right (deltaX > 0) → previous chapter
 */
export function useEpubSwipeGesture({
  isRenditionReady,
  renditionRef,
  onSwipeLeft,
  onSwipeRight,
  hasPrevChapter,
  hasNextChapter,
  enabled = true,
}: UseEpubSwipeGestureParams) {
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);
  const isTrackingRef = useRef(false);
  const isHorizontalRef = useRef(false);

  const handleTouchStart = useCallback((clientX: number, clientY: number) => {
    if (!enabled) return;
    touchStartXRef.current = clientX;
    touchStartYRef.current = clientY;
    isTrackingRef.current = true;
    isHorizontalRef.current = false;
  }, [enabled]);

  const handleTouchMove = useCallback((clientX: number, clientY: number) => {
    if (!isTrackingRef.current || !enabled) return;

    const deltaX = clientX - touchStartXRef.current;
    const deltaY = clientY - touchStartYRef.current;

    if (!isHorizontalRef.current) {
      if (Math.abs(deltaX) > DIRECTION_LOCK_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY)) {
        isHorizontalRef.current = true;
      } else if (Math.abs(deltaY) > Math.abs(deltaX)) {
        isTrackingRef.current = false;
      }
    }
  }, [enabled]);

  const handleTouchEnd = useCallback((clientX: number) => {
    if (!isTrackingRef.current || !isHorizontalRef.current || !enabled) {
      isTrackingRef.current = false;
      isHorizontalRef.current = false;
      return;
    }

    const deltaX = clientX - touchStartXRef.current;

    if (Math.abs(deltaX) > SWIPE_THRESHOLD) {
      if (deltaX < 0 && hasNextChapter) {
        onSwipeLeft();
      } else if (deltaX > 0 && hasPrevChapter) {
        onSwipeRight();
      }
    }

    isTrackingRef.current = false;
    isHorizontalRef.current = false;
  }, [enabled, hasNextChapter, hasPrevChapter, onSwipeLeft, onSwipeRight]);

  // Listen to epubjs rendition touch events (iframe content)
  useEffect(() => {
    if (!isRenditionReady || !enabled) return;
    const rendition = renditionRef.current;
    if (!rendition) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handleTouchStart(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handleTouchMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.changedTouches.length > 0) {
        handleTouchEnd(e.changedTouches[0].clientX);
      }
    };

    rendition.on("touchstart", onTouchStart);
    rendition.on("touchmove", onTouchMove);
    rendition.on("touchend", onTouchEnd);

    return () => {
      rendition.off("touchstart", onTouchStart);
      rendition.off("touchmove", onTouchMove);
      rendition.off("touchend", onTouchEnd);
    };
  }, [isRenditionReady, enabled, renditionRef, handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Listen to document touch events (non-iframe areas fallback)
  useEffect(() => {
    if (!enabled) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handleTouchStart(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handleTouchMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.changedTouches.length > 0) {
        handleTouchEnd(e.changedTouches[0].clientX);
      }
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd]);
}
