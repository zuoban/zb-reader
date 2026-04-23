"use client";

import { useCallback, useEffect, useRef } from "react";
import type { MutableRefObject } from "react";
import { EpubContext } from "@/lib/epub-context";
import type { ParagraphLayout } from "@/lib/pretext-layout";
import { findTextRange } from "@/lib/tts-utils";

interface UseEpubTtsHighlightingParams {
  activeTtsLocation?: string | null;
  activeTtsParagraph?: string;
  activeTtsParagraphId?: string | null;
  epubContextRef: MutableRefObject<EpubContext>;
  paragraphLayoutsRef: MutableRefObject<ParagraphLayout[]>;
  positionIndexRef: MutableRefObject<
    Array<{
      id: string;
      startY: number;
      endY: number;
      height: number;
      index: number;
    }>
  >;
  resolveRangeSafely: (location: string) => Promise<Range | null>;
  theme: "light" | "dark" | "sepia";
  ttsHighlightColor: string;
}

function normalizeText(text: string) {
  return text.replace(/\s+/g, "").trim();
}

export function useEpubTtsHighlighting({
  activeTtsLocation,
  activeTtsParagraph,
  activeTtsParagraphId,
  epubContextRef,
  paragraphLayoutsRef,
  positionIndexRef,
  resolveRangeSafely,
  theme,
  ttsHighlightColor,
}: UseEpubTtsHighlightingParams) {
  const highlightSpanRef = useRef<HTMLElement | null>(null);

  const findParagraphByPretext = useCallback(
    (doc: Document, searchText: string): HTMLElement | null => {
      const positionIndex = positionIndexRef.current;
      const paragraphLayouts = paragraphLayoutsRef.current;

      if (positionIndex.length === 0 || paragraphLayouts.length === 0) {
        return null;
      }

      const needle = normalizeText(searchText).slice(0, 80);
      if (!needle) return null;

      let bestLayout: ParagraphLayout | null = null;
      let bestScore = -1;

      for (const layout of paragraphLayouts) {
        const content = normalizeText(layout.text);
        if (!content) continue;

        const minLength = Math.min(48, Math.max(24, Math.floor(needle.length * 0.65)));

        let score = -1;
        if (content === needle) {
          score = 10000;
        } else if (content.includes(needle)) {
          score = 8000 - Math.abs(content.length - needle.length);
        } else if (needle.includes(content) && content.length >= minLength) {
          score = 5000 + content.length;
        }

        if (score > bestScore) {
          bestScore = score;
          bestLayout = layout;
        }
      }

      if (!bestLayout) return null;

      return doc.querySelector(
        `[data-reader-paragraph-id="${bestLayout.id}"]`
      ) as HTMLElement | null;
    },
    [paragraphLayoutsRef, positionIndexRef]
  );

  const findTtsElementByLocation = useCallback(
    async (location: string) => {
      const range = await resolveRangeSafely(location);
      const doc = epubContextRef.current.getDocument();
      if (!range || !doc?.body) return null;

      const candidateSelector = "p, li, blockquote, h1, h2, h3, h4, h5, h6";
      const startElement =
        range.startContainer.nodeType === Node.ELEMENT_NODE
          ? (range.startContainer as Element)
          : range.startContainer.parentElement;

      if (!startElement) return null;

      return startElement.closest(candidateSelector) as HTMLElement | null;
    },
    [epubContextRef, resolveRangeSafely]
  );

  useEffect(() => {
    const ctx = epubContextRef.current;
    const doc = ctx.getDocument();
    if (!doc?.body) return;

    let cancelled = false;

    const clearCurrentTtsState = () => {
      ctx.clearHighlightSpan();
      ctx.clearTtsHighlight();
      highlightSpanRef.current = null;
    };

    const applyActiveElement = async () => {
      clearCurrentTtsState();

      if (!activeTtsParagraph) {
        return;
      }

      const candidates = ctx.querySelectorAll(
        "p, li, blockquote, h1, h2, h3, h4, h5, h6"
      );

      candidates.forEach((element) => {
        const node = element as HTMLElement;
        node.style.opacity = "";
        node.style.display = "";
      });

      let matchedElement: Element | null = null;

      if (activeTtsParagraphId) {
        matchedElement = ctx.getElementByParagraphId(activeTtsParagraphId);
      }

      if (!matchedElement && activeTtsLocation) {
        matchedElement = await findTtsElementByLocation(activeTtsLocation);
      }

      if (!matchedElement) {
        matchedElement = findParagraphByPretext(doc, activeTtsParagraph);
      }

      if (!matchedElement) {
        const needle = normalizeText(activeTtsParagraph).slice(0, 80);
        if (!needle) return;

        const getCommonPrefixLength = (a: string, b: string) => {
          const limit = Math.min(a.length, b.length);
          let count = 0;
          while (count < limit && a[count] === b[count]) {
            count += 1;
          }
          return count;
        };

        let bestScore = -1;

        for (const element of Array.from(candidates)) {
          const content = normalizeText(element.textContent || "");
          if (!content) continue;

          const tag = element.tagName.toLowerCase();
          const isHeading = /^h[1-6]$/.test(tag);
          const minContainedLength = Math.min(
            48,
            Math.max(24, Math.floor(needle.length * 0.65))
          );

          let score = -1;
          if (content === needle) {
            score = 10000;
          } else if (content.includes(needle)) {
            score = 8000 - Math.abs(content.length - needle.length);
          } else if (needle.includes(content) && content.length >= minContainedLength) {
            score = 5000 + content.length;
          } else {
            const commonPrefixLength = getCommonPrefixLength(content, needle);
            const requiredPrefix = Math.min(30, Math.floor(needle.length * 0.5));
            if (commonPrefixLength >= requiredPrefix && content.length >= 24) {
              score = 4200 + commonPrefixLength;
            }
          }

          if (score < 0) continue;

          if (isHeading && score < 10000) {
            score -= 2500;
          }

          if (score > bestScore) {
            bestScore = score;
            matchedElement = element;
          }
        }
      }

      if (cancelled || !matchedElement) return;

      const activeElement = matchedElement as HTMLElement;
      activeElement.setAttribute("data-tts-active", "1");

      const range = findTextRange(activeElement, activeTtsParagraph);
      if (range) {
        const span = ctx.createHighlightSpan(range, ttsHighlightColor);
        if (span) {
          highlightSpanRef.current = span;
        }
      } else {
        activeElement.style.backgroundColor = `${ttsHighlightColor}20`;
        activeElement.style.borderRadius = "4px";
      }
    };

    void applyActiveElement();

    return () => {
      cancelled = true;
    };
  }, [
    activeTtsParagraphId,
    activeTtsLocation,
    activeTtsParagraph,
    epubContextRef,
    findTtsElementByLocation,
    findParagraphByPretext,
    theme,
    ttsHighlightColor,
  ]);

  useEffect(() => {
    if (!activeTtsParagraph) return;

    const ctx = epubContextRef.current;

    const doScroll = () => {
      const sentenceSpan = highlightSpanRef.current;
      if (sentenceSpan && ctx.getDocument()?.body?.contains(sentenceSpan)) {
        ctx.scrollToElement(sentenceSpan, 0.3);
        return;
      }

      const activeElement = ctx.getActiveTtsElement();
      if (!activeElement) return;

      ctx.scrollToElement(activeElement, 0.25);
    };

    doScroll();
    const timeoutId = setTimeout(doScroll, 100);

    return () => clearTimeout(timeoutId);
  }, [activeTtsParagraph, epubContextRef]);
}
