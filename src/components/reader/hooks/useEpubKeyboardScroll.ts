"use client";

import { useCallback, useEffect } from "react";
import type { MutableRefObject } from "react";
import type { Rendition } from "epubjs";
import { EpubContext } from "@/lib/epub-context";

interface UseEpubKeyboardScrollParams {
  epubContextRef: MutableRefObject<EpubContext>;
  isRenditionReady: boolean;
  renditionRef: MutableRefObject<Rendition | null>;
  onPrevChapter?: () => void;
  onNextChapter?: () => void;
}

function shouldIgnoreKeyTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target as HTMLElement)?.isContentEditable
  );
}

export function useEpubKeyboardScroll({
  epubContextRef,
  isRenditionReady,
  renditionRef,
  onPrevChapter,
  onNextChapter,
}: UseEpubKeyboardScrollParams) {
  const scrollByKey = useCallback(
    (event: KeyboardEvent) => {
      if (shouldIgnoreKeyTarget(event.target)) {
        return;
      }

      const container = epubContextRef.current.getScrollContainer();
      if (!container) return;

      const viewportHeight = container.clientHeight || window.innerHeight;
      const scrollAmount = Math.max(viewportHeight * 0.8, 300);

      switch (event.key) {
        case "ArrowUp":
          event.preventDefault();
          container.scrollBy({ top: -100, behavior: "smooth" });
          break;
        case "ArrowDown":
          event.preventDefault();
          container.scrollBy({ top: 100, behavior: "smooth" });
          break;
        case "ArrowLeft":
          if (onPrevChapter) {
            event.preventDefault();
            onPrevChapter();
          }
          break;
        case "ArrowRight":
          if (onNextChapter) {
            event.preventDefault();
            onNextChapter();
          }
          break;
        case " ": // Space
          event.preventDefault();
          if (event.shiftKey) {
            container.scrollBy({ top: -scrollAmount, behavior: "smooth" });
          } else {
            container.scrollBy({ top: scrollAmount, behavior: "smooth" });
          }
          break;
        case "PageUp":
          event.preventDefault();
          container.scrollBy({ top: -scrollAmount, behavior: "smooth" });
          break;
        case "PageDown":
          event.preventDefault();
          container.scrollBy({ top: scrollAmount, behavior: "smooth" });
          break;
        case "Home":
          event.preventDefault();
          container.scrollTo({ top: 0, behavior: "smooth" });
          break;
        case "End":
          event.preventDefault();
          container.scrollTo({
            top: container.scrollHeight,
            behavior: "smooth",
          });
          break;
      }
    },
    [epubContextRef, onPrevChapter, onNextChapter]
  );

  useEffect(() => {
    document.addEventListener("keydown", scrollByKey);
    return () => {
      document.removeEventListener("keydown", scrollByKey);
    };
  }, [scrollByKey]);

  useEffect(() => {
    const rendition = renditionRef.current;
    if (!rendition || !isRenditionReady) return;

    rendition.on("keydown", scrollByKey);
    return () => {
      rendition.off("keydown", scrollByKey);
    };
  }, [isRenditionReady, renditionRef, scrollByKey]);
}
