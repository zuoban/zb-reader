"use client";

import { useCallback, useEffect } from "react";
import type { MutableRefObject } from "react";
import type { Rendition } from "epubjs";
import { EpubContext } from "@/lib/epub-context";

interface UseEpubKeyboardScrollParams {
  epubContextRef: MutableRefObject<EpubContext>;
  isRenditionReady: boolean;
  renditionRef: MutableRefObject<Rendition | null>;
}

function shouldIgnoreKeyTarget(target: EventTarget | null) {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}

export function useEpubKeyboardScroll({
  epubContextRef,
  isRenditionReady,
  renditionRef,
}: UseEpubKeyboardScrollParams) {
  const scrollByKey = useCallback(
    (event: KeyboardEvent) => {
      if (shouldIgnoreKeyTarget(event.target)) {
        return;
      }

      const container = epubContextRef.current.getScrollContainer();
      if (!container) return;

      if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
        container.scrollBy({ top: -100, behavior: "smooth" });
      } else if (event.key === "ArrowDown" || event.key === "ArrowRight") {
        container.scrollBy({ top: 100, behavior: "smooth" });
      }
    },
    [epubContextRef]
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
