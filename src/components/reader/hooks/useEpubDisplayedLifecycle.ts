"use client";

import { useEffect } from "react";
import type { MutableRefObject } from "react";
import type { Rendition } from "epubjs";
import { EpubContext } from "@/lib/epub-context";

interface UseEpubDisplayedLifecycleParams {
  applyHighlights: () => Promise<void>;
  buildParagraphLayoutIndex: (doc: Document, containerWidth: number) => void;
  currentLocationRef: MutableRefObject<string | null>;
  epubContextRef: MutableRefObject<EpubContext>;
  lastLayoutCfiRef: MutableRefObject<string | null>;
  pageWidth: number;
  renditionRef: MutableRefObject<Rendition | null>;
}

export function useEpubDisplayedLifecycle({
  applyHighlights,
  buildParagraphLayoutIndex,
  currentLocationRef,
  epubContextRef,
  lastLayoutCfiRef,
  pageWidth,
  renditionRef,
}: UseEpubDisplayedLifecycleParams) {
  useEffect(() => {
    const rendition = renditionRef.current;
    if (!rendition) return;

    const handleDisplayed = () => {
      epubContextRef.current.applyTransparentBackground();

      const doc = epubContextRef.current.getDocument();
      const { width: containerWidth } = epubContextRef.current.getViewportSize();
      if (doc?.body) {
        epubContextRef.current.applyMaxWidthToChildren(pageWidth);
        buildParagraphLayoutIndex(doc, containerWidth);
        lastLayoutCfiRef.current = currentLocationRef.current;
      }

      void applyHighlights();
    };

    rendition.on("displayed", handleDisplayed);

    return () => {
      rendition.off("displayed", handleDisplayed);
    };
  }, [
    applyHighlights,
    buildParagraphLayoutIndex,
    currentLocationRef,
    epubContextRef,
    lastLayoutCfiRef,
    pageWidth,
    renditionRef,
  ]);
}
