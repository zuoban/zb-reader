"use client";

import { useCallback, useRef } from "react";
import type { MutableRefObject } from "react";
import { EpubContext } from "@/lib/epub-context";
import {
  prepareParagraphs,
  buildPositionIndex,
  findVisibleParagraphs,
  calculateLineHeight,
  type ParagraphLayout,
} from "@/lib/pretext-layout";
import type { ReaderParagraph } from "@/types/reader";

interface UseEpubParagraphsParams {
  currentLocationRef: MutableRefObject<string | null>;
  epubContextRef: MutableRefObject<EpubContext>;
  fontSize: number;
}

export function useEpubParagraphs({
  currentLocationRef,
  epubContextRef,
  fontSize,
}: UseEpubParagraphsParams) {
  const paragraphLayoutsRef = useRef<ParagraphLayout[]>([]);
  const positionIndexRef = useRef<
    Array<{
      id: string;
      startY: number;
      endY: number;
      height: number;
      index: number;
    }>
  >([]);
  const layoutContainerWidthRef = useRef<number>(0);
  const lastLayoutCfiRef = useRef<string | null>(null);

  const buildParagraphId = useCallback((index: number, text: string) => {
    const normalized = text
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 24);

    return `reader-p-${index}-${normalized || "text"}`;
  }, []);

  const buildParagraphLayoutIndex = useCallback(
    (doc: Document, containerWidth: number) => {
      const nodes = doc.body.querySelectorAll(
        "p, li, blockquote, h1, h2, h3, h4, h5, h6"
      );

      const paragraphs: ReaderParagraph[] = [];

      for (const [index, element] of Array.from(nodes).entries()) {
        const text = (element.textContent || "").replace(/\s+/g, " ").trim();
        if (text.length > 0 && text.length <= 800) {
          const id = buildParagraphId(index, text);
          element.setAttribute("data-reader-paragraph-id", id);
          paragraphs.push({
            id,
            text,
            location: epubContextRef.current.getCfiFromNode(element) || undefined,
          });
        }
      }

      if (paragraphs.length === 0) {
        paragraphLayoutsRef.current = [];
        positionIndexRef.current = [];
        return;
      }

      const layouts = prepareParagraphs(paragraphs, {
        fontSize,
        containerWidth,
        lineHeight: calculateLineHeight(fontSize),
      });

      paragraphLayoutsRef.current = layouts;
      positionIndexRef.current = buildPositionIndex(layouts);
      layoutContainerWidthRef.current = containerWidth;
    },
    [buildParagraphId, epubContextRef, fontSize]
  );

  const getCurrentParagraphs = useCallback((): ReaderParagraph[] => {
    const ctx = epubContextRef.current;
    const doc = ctx.getDocument();
    if (!doc?.body) return [];

    const currentCfi = currentLocationRef.current;
    if (currentCfi && currentCfi !== lastLayoutCfiRef.current) {
      paragraphLayoutsRef.current = [];
      positionIndexRef.current = [];
      lastLayoutCfiRef.current = currentCfi;
    }

    const normalizeParagraph = (text: string) => text.replace(/\s+/g, " ").trim();

    const containerScrollTop = ctx.getScrollTop();
    const { height: viewportHeight } = ctx.getViewportSize();

    const positionIndex = positionIndexRef.current;
    const paragraphLayouts = paragraphLayoutsRef.current;

    if (positionIndex.length > 0 && paragraphLayouts.length > 0) {
      const visibleIds = findVisibleParagraphs(
        positionIndex,
        containerScrollTop,
        viewportHeight,
        100
      );

      if (visibleIds.length > 0) {
        const visibleParagraphs: ReaderParagraph[] = [];

        for (const { index } of visibleIds) {
          const layout = paragraphLayouts[index];
          if (layout && layout.text.length > 0) {
            visibleParagraphs.push({
              id: layout.id,
              text: layout.text,
              location: layout.location,
            });
          }
        }

        if (visibleParagraphs.length > 0) {
          return visibleParagraphs;
        }
      }
    }

    const nodes = doc.body.querySelectorAll(
      "p, li, blockquote, h1, h2, h3, h4, h5, h6"
    );

    const elementArray = Array.from(nodes) as HTMLElement[];
    const { width: viewportWidth } = ctx.getViewportSize();

    const visibleTop = containerScrollTop;
    const visibleBottom = containerScrollTop + viewportHeight;

    const isRectVisible = (rect: DOMRect) =>
      rect.bottom > visibleTop &&
      rect.top < visibleBottom &&
      rect.right > 0 &&
      rect.left < viewportWidth;

    const isElementOnCurrentViewport = (element: HTMLElement) => {
      const rects = Array.from(element.getClientRects());

      for (const rect of rects) {
        if (!isRectVisible(rect)) continue;

        const viewportX = Math.min(
          viewportWidth - 1,
          Math.max(1, Math.floor(rect.left + Math.min(rect.width / 2, 24)))
        );
        const viewportY = Math.min(
          viewportHeight - 1,
          Math.max(1, Math.floor(rect.top + Math.min(rect.height / 2, 12)))
        );
        const hit = doc.elementFromPoint(viewportX, viewportY) as HTMLElement | null;
        if (!hit) continue;

        if (element === hit || element.contains(hit)) {
          return true;
        }
      }

      return false;
    };

    const getParagraphLocation = (element: HTMLElement) => {
      const cfi = ctx.getCfiFromNode(element);
      return cfi || undefined;
    };

    const visibleParagraphs: ReaderParagraph[] = [];

    for (const [index, element] of elementArray.entries()) {
      if (isElementOnCurrentViewport(element)) {
        const text = normalizeParagraph(element.textContent || "");
        if (text.length > 0) {
          const id = buildParagraphId(index, text);
          element.setAttribute("data-reader-paragraph-id", id);
          visibleParagraphs.push({
            id,
            text,
            location: getParagraphLocation(element),
          });
        }
      }
    }

    if (visibleParagraphs.length > 0) {
      return visibleParagraphs;
    }

    const pageCenterY = containerScrollTop + viewportHeight / 2;
    const nearestParagraphs = elementArray
      .map((element, index) => {
        const rects = Array.from(element.getClientRects());
        const text = normalizeParagraph(element.textContent || "");
        const id = buildParagraphId(index, text);
        element.setAttribute("data-reader-paragraph-id", id);
        if (rects.length === 0) {
          return { distance: Infinity, id, text, location: getParagraphLocation(element) };
        }
        const minDistance = rects.reduce((best, rect) => {
          const rectCenterY = rect.top + rect.height / 2;
          return Math.min(best, Math.abs(rectCenterY - pageCenterY));
        }, Infinity);
        return {
          distance: minDistance,
          id,
          text,
          location: getParagraphLocation(element),
        };
      })
      .filter(
        (item) =>
          item.text.length > 0 &&
          item.text.length <= 800 &&
          item.distance < viewportHeight
      )
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 24)
      .map((item) => ({
        id: item.id,
        text: item.text,
        location: item.location,
      }));

    if (nearestParagraphs.length > 0) {
      return nearestParagraphs;
    }

    return [];
  }, [buildParagraphId, currentLocationRef, epubContextRef]);

  const isFirstVisibleParagraphComplete = useCallback(() => {
    const ctx = epubContextRef.current;
    const doc = ctx.getDocument();
    if (!doc?.body) return true;

    const nodes = doc.body.querySelectorAll(
      "p, li, blockquote, h1, h2, h3, h4, h5, h6"
    );

    const elementArray = Array.from(nodes) as HTMLElement[];
    const { width: viewportWidth, height: viewportHeight } = ctx.getViewportSize();
    const containerScrollTop = ctx.getScrollTop();

    const visibleTop = containerScrollTop;
    const visibleBottom = containerScrollTop + viewportHeight;

    const isRectVisible = (rect: DOMRect) =>
      rect.bottom > visibleTop &&
      rect.top < visibleBottom &&
      rect.right > 0 &&
      rect.left < viewportWidth;

    const isElementOnCurrentViewport = (element: HTMLElement) => {
      const rects = Array.from(element.getClientRects());

      for (const rect of rects) {
        if (!isRectVisible(rect)) continue;

        const viewportX = Math.min(
          viewportWidth - 1,
          Math.max(1, Math.floor(rect.left + Math.min(rect.width / 2, 24)))
        );
        const viewportY = Math.min(
          viewportHeight - 1,
          Math.max(1, Math.floor(rect.top + Math.min(rect.height / 2, 12)))
        );
        const hit = doc.elementFromPoint(viewportX, viewportY) as HTMLElement | null;
        if (!hit) continue;

        if (element === hit || element.contains(hit)) {
          return true;
        }
      }

      return false;
    };

    for (const element of elementArray) {
      if (isElementOnCurrentViewport(element)) {
        const rects = Array.from(element.getClientRects());
        for (const rect of rects) {
          if (rect.bottom > visibleTop && rect.top < visibleBottom) {
            if (rect.top < visibleTop - 5) {
              return false;
            }
            return true;
          }
        }
      }
    }

    return true;
  }, [epubContextRef]);

  return {
    buildParagraphLayoutIndex,
    getCurrentParagraphs,
    isFirstVisibleParagraphComplete,
    lastLayoutCfiRef,
    paragraphLayoutsRef,
    positionIndexRef,
  };
}
