"use client";

import { useCallback, useEffect, useRef } from "react";
import type { MutableRefObject } from "react";
import type { Rendition } from "epubjs";

interface EpubHighlight {
  cfiRange: string;
  color: string;
  id: string;
}

interface UseEpubHighlightsParams {
  highlights?: EpubHighlight[];
  isRenditionReady: boolean;
  renditionRef: MutableRefObject<Rendition | null>;
  resolveRangeSafely: (location: string) => Promise<Range | null>;
}

export function useEpubHighlights({
  highlights,
  isRenditionReady,
  renditionRef,
  resolveRangeSafely,
}: UseEpubHighlightsParams) {
  const pendingHighlightsRef = useRef<EpubHighlight[]>([]);
  const highlightMapRef = useRef<Map<string, string>>(new Map());

  const clearHighlights = useCallback(() => {
    const rendition = renditionRef.current;
    if (!rendition) {
      highlightMapRef.current.clear();
      return;
    }

    highlightMapRef.current.forEach((cfiRange) => {
      try {
        rendition.annotations.remove(cfiRange, "highlight");
      } catch {
        // ignore stale annotation cleanup
      }
    });
    highlightMapRef.current.clear();
  }, [renditionRef]);

  const applyHighlights = useCallback(async () => {
    const rendition = renditionRef.current;
    if (!rendition || !isRenditionReady) return;

    const currentHighlights = pendingHighlightsRef.current;
    clearHighlights();

    if (!currentHighlights || currentHighlights.length === 0) return;

    for (const highlight of currentHighlights) {
      const range = await resolveRangeSafely(highlight.cfiRange);
      if (!range) {
        continue;
      }

      try {
        rendition.annotations.highlight(
          highlight.cfiRange,
          { id: highlight.id },
          undefined,
          undefined,
          { fill: highlight.color, "fill-opacity": "0.3" }
        );
        highlightMapRef.current.set(highlight.id, highlight.cfiRange);
      } catch {
        // ignore invalid highlight ranges
      }
    }
  }, [clearHighlights, isRenditionReady, renditionRef, resolveRangeSafely]);

  useEffect(() => {
    pendingHighlightsRef.current = highlights || [];
    void applyHighlights();
  }, [highlights, applyHighlights]);

  useEffect(() => {
    if (isRenditionReady) {
      void applyHighlights();
    }
  }, [isRenditionReady, applyHighlights]);

  useEffect(() => clearHighlights, [clearHighlights]);

  return { applyHighlights };
}
