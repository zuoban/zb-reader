"use client";

import {
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useState,
} from "react";
import ePub, { Book, Rendition } from "epubjs";
import { logger } from "@/lib/logger";

interface EpubReaderProps {
  url: string;
  initialLocation?: string;
  fontSize?: number;
  pageWidth?: number;
  theme?: "light" | "dark" | "sepia";
  onLocationChange?: (location: {
    cfi: string;
    progress: number;
    currentPage?: number;
    totalPages?: number;
    href?: string;
    scrollRatio?: number;
  }) => void;
  onTocLoaded?: (toc: TocItem[]) => void;
  onTextSelected?: (cfiRange: string, text: string) => void;
  onReady?: () => void;
  onClick?: () => void;
  highlights?: Array<{ cfiRange: string; color: string; id: string }>;
  activeTtsParagraph?: string;
  activeTtsParagraphId?: string | null;
  activeTtsLocation?: string | null;
  ttsPlaybackProgress?: number;
  ttsHighlightStyle?: "background" | "indicator";
  ttsHighlightColor?: string;
  autoScrollToActive?: boolean;
}

export interface ReaderParagraph {
  id: string;
  text: string;
  location?: string;
}

export interface EpubReaderRef {
  goToLocation: (cfi: string) => void;
  goToHref: (href: string) => void;
  goToPercentage: (percentage: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  scrollDown: (amount?: number) => void;
  scrollUp: (amount?: number) => void;
  getCurrentLocation: () => string | null;
  getActiveTtsLocation: () => string | null;
  getProgress: () => number;
  getCurrentText: () => string | null;
  getCurrentParagraphs: () => ReaderParagraph[];
  isFirstVisibleParagraphComplete: () => boolean;
  scrollToActiveParagraph: () => void;
}

export interface TocItem {
  label: string;
  href: string;
  id?: string;
  subitems?: TocItem[];
}

interface RawTocItem {
  label: string;
  href: string;
  id?: string;
  subitems?: RawTocItem[];
}

const THEME_STYLES: Record<
  NonNullable<EpubReaderProps["theme"]>,
  Record<string, Record<string, string>>
> = {
  light: {
    html: {
      background: "transparent",
    },
    body: {
      background: "transparent",
      color: "hsl(240 10% 3.9%)",
      "font-family":
        '"Baskerville", "Iowan Old Style", "Palatino Linotype", "Noto Serif SC", "Songti SC", "Source Han Serif SC", serif',
      "line-height": "2.08",
      "letter-spacing": "0.01em",
      "text-rendering": "optimizeLegibility",
      "-webkit-font-smoothing": "antialiased",
      "font-kerning": "normal",
      "word-break": "break-word",
      "overflow-wrap": "break-word",
      "padding-top": "2.35rem",
      "padding-bottom": "5rem",
      "padding-left": "1.25rem",
      "padding-right": "1.25rem",
      margin: "0",
      width: "100%",
      "max-width": "none",
      display: "flex",
      "flex-direction": "column",
      "align-items": "center",
      "box-sizing": "border-box",
    },
    "body > *": {
      width: "100%",
      "max-width": "66ch",
      "margin-left": "auto",
      "margin-right": "auto",
      "box-sizing": "border-box",
    },
    p: {
      margin: "0 0 1.42em",
      "text-align": "justify",
      "text-indent": "2em",
    },
    "h1, h2, h3, h4, h5, h6": {
      color: "hsl(240 10% 3.9%)",
      "font-weight": "600",
      "line-height": "1.5",
      "margin-top": "2.45em",
      "margin-bottom": "1em",
      "letter-spacing": "0.028em",
      "text-align": "center",
      "text-wrap": "balance",
    },
    h1: {
      "font-size": "1.72em",
      "line-height": "1.38",
      "margin-top": "0.4em",
      "margin-bottom": "1.25em",
      "font-weight": "700",
    },
    h2: {
      "font-size": "1.28em",
      "margin-top": "2.8em",
      "margin-bottom": "1.1em",
    },
    h3: {
      "font-size": "1.12em",
      "margin-top": "2.3em",
      "margin-bottom": "0.95em",
    },
    "ul, ol": {
      margin: "1.3em 0 1.55em",
      padding: "0 0 0 1.7em",
    },
    li: {
      margin: "0.48em 0",
      "padding-left": "0.2em",
      "line-height": "1.95",
    },
    blockquote: {
      margin: "1.7em auto",
      padding: "1.05em 1.2em",
      "border-left": "3px solid rgba(24,24,27,0.16)",
      "border-radius": "0.95rem",
      background: "rgba(24,24,27,0.03)",
      color: "rgba(24,24,27,0.78)",
    },
    hr: {
      width: "5.5rem",
      height: "1px",
      margin: "2.8em auto",
      border: "0",
      background:
        "linear-gradient(90deg, transparent 0%, rgba(24,24,27,0.18) 18%, rgba(24,24,27,0.18) 82%, transparent 100%)",
    },
    "pre, code, kbd": {
      "font-family":
        '"SFMono-Regular", "JetBrains Mono", "Fira Code", "Courier New", monospace',
    },
    pre: {
      margin: "1.6em 0",
      padding: "1em 1.1em",
      "border-radius": "0.95rem",
      background: "rgba(24,24,27,0.045)",
      border: "1px solid rgba(24,24,27,0.08)",
      "font-size": "0.92em",
      "line-height": "1.72",
      overflow: "auto",
      "white-space": "pre-wrap",
    },
    code: {
      "font-size": "0.92em",
      background: "rgba(24,24,27,0.06)",
      "border-radius": "0.45rem",
      padding: "0.12em 0.36em",
    },
    "figure, .figure": {
      margin: "2em auto",
      "text-align": "center",
    },
    figcaption: {
      margin: "0.9em auto 0",
      "font-size": "0.88em",
      color: "rgba(24,24,27,0.56)",
      "line-height": "1.7",
    },
    "strong, b": {
      "font-weight": "700",
      color: "rgba(24,24,27,0.92)",
    },
    "em, i": {
      "font-style": "italic",
      color: "rgba(24,24,27,0.82)",
    },
    "img, svg, video, canvas": {
      "max-width": "100%",
      height: "auto",
      "border-radius": "0.9rem",
      "box-shadow": "0 16px 32px -28px rgba(15,23,42,0.35)",
    },
    "a, a:visited": {
      color: "inherit",
    },
  },
  dark: {
    html: {
      background: "transparent",
    },
    body: {
      background: "transparent",
      color: "hsl(0 0% 98%)",
      "font-family":
        '"Baskerville", "Iowan Old Style", "Palatino Linotype", "Noto Serif SC", "Songti SC", "Source Han Serif SC", serif',
      "line-height": "2.08",
      "letter-spacing": "0.01em",
      "text-rendering": "optimizeLegibility",
      "-webkit-font-smoothing": "antialiased",
      "font-kerning": "normal",
      "word-break": "break-word",
      "overflow-wrap": "break-word",
      "padding-top": "2.35rem",
      "padding-bottom": "5rem",
      "padding-left": "1.25rem",
      "padding-right": "1.25rem",
      margin: "0",
      width: "100%",
      "max-width": "none",
      display: "flex",
      "flex-direction": "column",
      "align-items": "center",
      "box-sizing": "border-box",
    },
    "body > *": {
      width: "100%",
      "max-width": "66ch",
      "margin-left": "auto",
      "margin-right": "auto",
      "box-sizing": "border-box",
    },
    p: {
      margin: "0 0 1.42em",
      "text-align": "justify",
      "text-indent": "2em",
    },
    "h1, h2, h3, h4, h5, h6": {
      color: "hsl(0 0% 98%)",
      "font-weight": "600",
      "line-height": "1.5",
      "margin-top": "2.45em",
      "margin-bottom": "1em",
      "letter-spacing": "0.028em",
      "text-align": "center",
      "text-wrap": "balance",
    },
    h1: {
      "font-size": "1.72em",
      "line-height": "1.38",
      "margin-top": "0.4em",
      "margin-bottom": "1.25em",
      "font-weight": "700",
    },
    h2: {
      "font-size": "1.28em",
      "margin-top": "2.8em",
      "margin-bottom": "1.1em",
    },
    h3: {
      "font-size": "1.12em",
      "margin-top": "2.3em",
      "margin-bottom": "0.95em",
    },
    "ul, ol": {
      margin: "1.3em 0 1.55em",
      padding: "0 0 0 1.7em",
    },
    li: {
      margin: "0.48em 0",
      "padding-left": "0.2em",
      "line-height": "1.95",
    },
    blockquote: {
      margin: "1.7em auto",
      padding: "1.05em 1.2em",
      "border-left": "3px solid rgba(255,255,255,0.2)",
      "border-radius": "0.95rem",
      background: "rgba(255,255,255,0.04)",
      color: "rgba(250,250,250,0.8)",
    },
    hr: {
      width: "5.5rem",
      height: "1px",
      margin: "2.8em auto",
      border: "0",
      background:
        "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.22) 18%, rgba(255,255,255,0.22) 82%, transparent 100%)",
    },
    "pre, code, kbd": {
      "font-family":
        '"SFMono-Regular", "JetBrains Mono", "Fira Code", "Courier New", monospace',
    },
    pre: {
      margin: "1.6em 0",
      padding: "1em 1.1em",
      "border-radius": "0.95rem",
      background: "rgba(255,255,255,0.05)",
      border: "1px solid rgba(255,255,255,0.08)",
      "font-size": "0.92em",
      "line-height": "1.72",
      overflow: "auto",
      "white-space": "pre-wrap",
    },
    code: {
      "font-size": "0.92em",
      background: "rgba(255,255,255,0.08)",
      "border-radius": "0.45rem",
      padding: "0.12em 0.36em",
    },
    "figure, .figure": {
      margin: "2em auto",
      "text-align": "center",
    },
    figcaption: {
      margin: "0.9em auto 0",
      "font-size": "0.88em",
      color: "rgba(250,250,250,0.56)",
      "line-height": "1.7",
    },
    "strong, b": {
      "font-weight": "700",
      color: "rgba(250,250,250,0.95)",
    },
    "em, i": {
      "font-style": "italic",
      color: "rgba(250,250,250,0.82)",
    },
    "img, svg, video, canvas": {
      "max-width": "100%",
      height: "auto",
      "border-radius": "0.9rem",
      "box-shadow": "0 20px 36px -30px rgba(0,0,0,0.6)",
    },
    "a, a:visited": {
      color: "inherit",
    },
  },
  sepia: {
    html: {
      background: "transparent",
    },
    body: {
      background: "transparent",
      color: "#5B4636",
      "font-family":
        '"Baskerville", "Iowan Old Style", "Palatino Linotype", "Noto Serif SC", "Songti SC", "Source Han Serif SC", serif',
      "line-height": "2.14",
      "letter-spacing": "0.012em",
      "text-rendering": "optimizeLegibility",
      "-webkit-font-smoothing": "antialiased",
      "font-kerning": "normal",
      "word-break": "break-word",
      "overflow-wrap": "break-word",
      "padding-top": "2.45rem",
      "padding-bottom": "5.1rem",
      "padding-left": "1.25rem",
      "padding-right": "1.25rem",
      margin: "0",
      width: "100%",
      "max-width": "none",
      display: "flex",
      "flex-direction": "column",
      "align-items": "center",
      "box-sizing": "border-box",
    },
    "body > *": {
      width: "100%",
      "max-width": "66ch",
      "margin-left": "auto",
      "margin-right": "auto",
      "box-sizing": "border-box",
    },
    p: {
      margin: "0 0 1.5em",
      "text-align": "justify",
      "text-indent": "2em",
    },
    "h1, h2, h3, h4, h5, h6": {
      color: "#4C382B",
      "font-weight": "600",
      "line-height": "1.5",
      "margin-top": "2.5em",
      "margin-bottom": "1.05em",
      "letter-spacing": "0.03em",
      "text-align": "center",
      "text-wrap": "balance",
    },
    h1: {
      "font-size": "1.76em",
      "line-height": "1.4",
      "margin-top": "0.45em",
      "margin-bottom": "1.3em",
      "font-weight": "700",
    },
    h2: {
      "font-size": "1.3em",
      "margin-top": "2.9em",
      "margin-bottom": "1.12em",
    },
    h3: {
      "font-size": "1.14em",
      "margin-top": "2.35em",
      "margin-bottom": "0.98em",
    },
    "ul, ol": {
      margin: "1.38em 0 1.62em",
      padding: "0 0 0 1.7em",
    },
    li: {
      margin: "0.5em 0",
      "padding-left": "0.2em",
      "line-height": "2",
    },
    blockquote: {
      margin: "1.8em auto",
      padding: "1.08em 1.25em",
      "border-left": "3px solid rgba(91,70,54,0.18)",
      "border-radius": "0.95rem",
      background: "rgba(91,70,54,0.045)",
      color: "rgba(91,70,54,0.82)",
    },
    hr: {
      width: "5.5rem",
      height: "1px",
      margin: "2.9em auto",
      border: "0",
      background:
        "linear-gradient(90deg, transparent 0%, rgba(91,70,54,0.2) 18%, rgba(91,70,54,0.2) 82%, transparent 100%)",
    },
    "pre, code, kbd": {
      "font-family":
        '"SFMono-Regular", "JetBrains Mono", "Fira Code", "Courier New", monospace',
    },
    pre: {
      margin: "1.7em 0",
      padding: "1em 1.1em",
      "border-radius": "0.95rem",
      background: "rgba(91,70,54,0.06)",
      border: "1px solid rgba(91,70,54,0.08)",
      "font-size": "0.92em",
      "line-height": "1.76",
      overflow: "auto",
      "white-space": "pre-wrap",
    },
    code: {
      "font-size": "0.92em",
      background: "rgba(91,70,54,0.07)",
      "border-radius": "0.45rem",
      padding: "0.12em 0.36em",
    },
    "figure, .figure": {
      margin: "2.1em auto",
      "text-align": "center",
    },
    figcaption: {
      margin: "0.9em auto 0",
      "font-size": "0.88em",
      color: "rgba(91,70,54,0.58)",
      "line-height": "1.74",
    },
    "strong, b": {
      "font-weight": "700",
      color: "rgba(76,56,43,0.96)",
    },
    "em, i": {
      "font-style": "italic",
      color: "rgba(91,70,54,0.82)",
    },
    "img, svg, video, canvas": {
      "max-width": "100%",
      height: "auto",
      "border-radius": "0.9rem",
      "box-shadow": "0 16px 32px -28px rgba(91,70,54,0.34)",
    },
    "a, a:visited": {
      color: "inherit",
    },
  },
};

const EpubReader = forwardRef<EpubReaderRef, EpubReaderProps>(
  (
    {
      url,
      initialLocation,
      fontSize = 16,
      pageWidth = 800,
      theme = "light",
      onLocationChange,
      onTocLoaded,
      onTextSelected,
      onReady,
      onClick,
      highlights,
      activeTtsParagraph,
      activeTtsParagraphId,
      activeTtsLocation,
      ttsPlaybackProgress = 0,
      ttsHighlightStyle = "indicator",
      ttsHighlightColor = "#3b82f6",
      autoScrollToActive = true,
    },
    ref
  ) => {
    const viewerRef = useRef<HTMLDivElement>(null);
    const bookRef = useRef<Book | null>(null);
    const renditionRef = useRef<Rendition | null>(null);
    const currentLocationRef = useRef<string | null>(null);
    const progressRef = useRef<number>(0);
    const scrollRatioRef = useRef<number>(0);
    const highlightIdsRef = useRef<Set<string>>(new Set());
    const [_isReady, setIsReady] = useState(false);
    const [isRenditionReady, setIsRenditionReady] = useState(false);
    const pendingHighlightsRef = useRef<Array<{ cfiRange: string; color: string; id: string }>>([]);
    const justSelectedRef = useRef(false);

    const buildParagraphId = useCallback((index: number, text: string) => {
      const normalized = text
        .toLowerCase()
        .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 24);

      return `reader-p-${index}-${normalized || "text"}`;
    }, []);

    const stripScrollSuffix = useCallback((location: string) => {
      const scrollSepIdx = location.indexOf("#scroll=");
      return scrollSepIdx === -1 ? location : location.slice(0, scrollSepIdx);
    }, []);

    const resolveRangeSafely = useCallback(
      async (location: string) => {
        const book = bookRef.current;
        if (!book) return null;

        try {
          return await book.getRange(stripScrollSuffix(location));
        } catch (error) {
          logger.warn("epub-reader", "解析 CFI 失败", { location, error });
          return null;
        }
      },
      [stripScrollSuffix]
    );

    useImperativeHandle(ref, () => ({
      goToLocation(cfi: string) {
        void resolveRangeSafely(cfi).then((range) => {
          if (!range) return;
          renditionRef.current?.display(stripScrollSuffix(cfi));
        });
      },
      goToHref(href: string) {
        renditionRef.current?.display(href);
      },
      goToPercentage(percentage: number) {
        const book = bookRef.current;
        if (!book || !renditionRef.current) return;
        const cfi = book.locations.cfiFromPercentage(percentage);
        if (cfi) {
          renditionRef.current.display(cfi);
        }
      },
      nextPage() {
        const rendition = renditionRef.current;
        if (!rendition) return;
        rendition.next();
      },
      prevPage() {
        const rendition = renditionRef.current;
        if (!rendition) return;
        rendition.prev();
      },
      scrollDown(amount = 300) {
        const epubContainer = viewerRef.current?.querySelector(".epub-container") as HTMLElement | null;
        if (epubContainer) {
          epubContainer.scrollBy({ top: amount, behavior: "smooth" });
        }
      },
      scrollUp(amount = 300) {
        const epubContainer = viewerRef.current?.querySelector(".epub-container") as HTMLElement | null;
        if (epubContainer) {
          epubContainer.scrollBy({ top: -amount, behavior: "smooth" });
        }
      },
      getCurrentLocation() {
        return currentLocationRef.current;
      },
      getActiveTtsLocation() {
        const contents = renditionRef.current?.getContents?.() as
          | Array<{ document?: Document; cfiFromNode?: (node: Node, ignoreClass?: string) => string }>
          | undefined;
        const content = contents?.[0];
        const doc = content?.document;
        const activeElement = doc?.querySelector("[data-tts-active='1']");
        if (!activeElement || !content?.cfiFromNode) {
          return null;
        }

        try {
          return content.cfiFromNode(activeElement);
        } catch {
          return null;
        }
      },
      getProgress() {
        return progressRef.current;
      },
      getCurrentText() {
        const contents = renditionRef.current?.getContents?.() as
          | Array<{ document?: Document }>
          | undefined;
        const text = contents?.[0]?.document?.body?.innerText?.trim();
        return text && text.length > 0 ? text : null;
      },
      getCurrentParagraphs() {
        const contents = renditionRef.current?.getContents?.() as
          | Array<{ document?: Document; window?: Window; cfiFromNode?: (node: Node, ignoreClass?: string) => string }>
          | undefined;
        const content = contents?.[0];
        const doc = content?.document;
        if (!doc?.body) return [];

        const nodes = doc.body.querySelectorAll(
          "p, li, blockquote, h1, h2, h3, h4, h5, h6"
        );

        const elementArray = Array.from(nodes) as HTMLElement[];
        const viewportWidth = doc.body.clientWidth || content?.window?.innerWidth || window.innerWidth;
        const viewportHeight = content?.window?.innerHeight || window.innerHeight;

        const normalizeParagraph = (text: string) => text.replace(/\s+/g, " ").trim();

        const epubContainer = viewerRef.current?.querySelector(".epub-container") as HTMLElement | null;
        const containerScrollTop = epubContainer?.scrollTop ?? 0;

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
          try {
            return content?.cfiFromNode?.(element) || undefined;
          } catch {
            return undefined;
          }
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
          .filter((item) => item.text.length > 0 && item.text.length <= 800 && item.distance < viewportHeight)
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
      },

      isFirstVisibleParagraphComplete() {
        const contents = renditionRef.current?.getContents?.() as
          | Array<{ document?: Document; window?: Window }>
          | undefined;
        const content = contents?.[0];
        const doc = content?.document;
        if (!doc?.body) return true;

        const nodes = doc.body.querySelectorAll(
          "p, li, blockquote, h1, h2, h3, h4, h5, h6"
        );

        const elementArray = Array.from(nodes) as HTMLElement[];
        const viewportWidth = doc.body.clientWidth || content?.window?.innerWidth || window.innerWidth;
        const viewportHeight = content?.window?.innerHeight || window.innerHeight;

        const epubContainer = viewerRef.current?.querySelector(".epub-container") as HTMLElement | null;
        const containerScrollTop = epubContainer?.scrollTop ?? 0;

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
      },
      scrollToActiveParagraph() {
        const contents = renditionRef.current?.getContents?.() as
          | Array<{ document?: Document }>
          | undefined;
        const doc = contents?.[0]?.document;
        if (!doc) return;

        const activeElement = doc.querySelector("[data-tts-active='1']") as HTMLElement | null;
        if (!activeElement) return;

        const epubContainer = viewerRef.current?.querySelector(".epub-container") as HTMLElement | null;
        if (!epubContainer) return;

        let elementOffsetTop = 0;
        let node: HTMLElement | null = activeElement;
        while (node) {
          elementOffsetTop += node.offsetTop;
          node = node.offsetParent as HTMLElement | null;
        }

        const iframeEl = epubContainer.querySelector("iframe") as HTMLElement | null;
        let iframeOffsetTop = 0;
        if (iframeEl) {
          let n: HTMLElement | null = iframeEl;
          while (n && n !== epubContainer) {
            iframeOffsetTop += n.offsetTop;
            n = n.offsetParent as HTMLElement | null;
          }
        }

        const absoluteTop = iframeOffsetTop + elementOffsetTop;
        const targetScrollTop = absoluteTop;
        epubContainer.scrollTo({ top: Math.max(0, targetScrollTop), behavior: "smooth" });
      },
    }));

    const normalizeText = useCallback((text: string) => {
      return text.replace(/\s+/g, "").trim();
    }, []);

    const findTtsElementByLocation = useCallback(
      async (location: string) => {
        const range = await resolveRangeSafely(location);
        const contents = renditionRef.current?.getContents?.() as
          | Array<{ document?: Document }>
          | undefined;
        const doc = contents?.[0]?.document;
        if (!range || !doc?.body) return null;

        const candidateSelector = "p, li, blockquote, h1, h2, h3, h4, h5, h6";
        const startElement =
          range.startContainer.nodeType === Node.ELEMENT_NODE
            ? (range.startContainer as Element)
            : range.startContainer.parentElement;

        if (!startElement) return null;

        return startElement.closest(candidateSelector) as HTMLElement | null;
      },
      [resolveRangeSafely]
    );

    useEffect(() => {
      const contents = renditionRef.current?.getContents?.() as
        | Array<{ document?: Document }>
        | undefined;
      const doc = contents?.[0]?.document;
      if (!doc?.body) return;

      let cancelled = false;

      const clearCurrentTtsState = () => {
        const activeNodes = doc.body.querySelectorAll("[data-tts-active='1']");
        activeNodes.forEach((node) => {
          node.removeAttribute("data-tts-active");
          const element = node as HTMLElement;
          element.style.backgroundColor = "";
          element.style.transition = "";
          element.style.opacity = "";
          element.style.display = "";
          element.style.padding = "";
          element.style.border = "";
          element.style.borderRadius = "";
          element.style.boxShadow = "";
          element.style.maxWidth = "";
          element.style.width = "";
          element.style.fontSize = "";
          element.style.lineHeight = "";
          element.style.margin = "";
          element.style.position = "";
          element.style.removeProperty("--tts-indicator-color");
          element.style.backgroundImage = "";
          element.style.backgroundPosition = "";
          element.style.backgroundSize = "";
          element.style.backgroundRepeat = "";
          element.style.paddingBottom = "";
          element.style.marginLeft = "";
          element.style.marginRight = "";
          element.style.background = "";
          element.style.color = "";
          element.style.borderLeft = "";
          element.style.borderImage = "";
          element.style.paddingLeft = "";
        });

        doc.body.removeAttribute("data-tts-immersive");
      };

      const applyActiveElement = async () => {
        clearCurrentTtsState();

        if (!activeTtsParagraph) {
          return;
        }

        const candidates = doc.body.querySelectorAll(
          "p, li, blockquote, h1, h2, h3, h4, h5, h6"
        );

        candidates.forEach((element) => {
          const node = element as HTMLElement;
          node.style.opacity = "";
          node.style.display = "";
        });

        let matchedElement: Element | null = null;

        if (activeTtsParagraphId) {
          matchedElement = doc.querySelector(
            `[data-reader-paragraph-id="${activeTtsParagraphId}"]`
          );
        }

        if (!matchedElement && activeTtsLocation) {
          matchedElement = await findTtsElementByLocation(activeTtsLocation);
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

        matchedElement.setAttribute("data-tts-active", "1");
        const activeElement = matchedElement as HTMLElement;
        activeElement.style.transition = "all 220ms ease";
        activeElement.style.opacity = "1";
        activeElement.style.position = "relative";

        const progressPercent = Math.min(100, Math.max(0, ttsPlaybackProgress * 100));

        if (ttsHighlightStyle === "background") {
          const rgbColor = ttsHighlightColor.startsWith("#")
            ? ttsHighlightColor
            : "#3b82f6";
          const r = parseInt(rgbColor.slice(1, 3), 16);
          const g = parseInt(rgbColor.slice(3, 5), 16);
          const b = parseInt(rgbColor.slice(5, 7), 16);

          activeElement.style.background = `linear-gradient(180deg, 
            rgba(${r}, ${g}, ${b}, 0.12) 0%, 
            rgba(${r}, ${g}, ${b}, 0.08) ${progressPercent}%,
            rgba(${r}, ${g}, ${b}, 0.15) ${progressPercent}%,
            rgba(${r}, ${g}, ${b}, 0.05) 100%
          )`;
          activeElement.style.borderRadius = "6px";
          activeElement.style.padding = "4px 8px";
          activeElement.style.marginLeft = "-8px";
          activeElement.style.marginRight = "-8px";
          activeElement.style.boxShadow = `
            inset 0 1px 0 color-mix(in srgb, ${ttsHighlightColor} 20%, transparent),
            inset 0 -1px 0 color-mix(in srgb, ${ttsHighlightColor} 15%, transparent),
            0 0 0 1px color-mix(in srgb, ${ttsHighlightColor} 30%, transparent),
            0 2px 8px color-mix(in srgb, ${ttsHighlightColor} 20%, transparent)
          `;
          activeElement.style.transition = "all 0.25s ease";
          activeElement.style.color = `color-mix(in srgb, ${ttsHighlightColor} 90%, currentColor)`;
        } else {
          const trackColor = `color-mix(in srgb, ${ttsHighlightColor} 14%, transparent)`;
          const progressColor = `color-mix(in srgb, ${ttsHighlightColor} 70%, transparent)`;
          activeElement.style.backgroundColor = "";
          activeElement.style.borderRadius = "";
          activeElement.style.padding = "0 0 0 12px";
          activeElement.style.paddingLeft = "12px";
          activeElement.style.boxShadow = "";
          activeElement.style.background = "";
          activeElement.style.backgroundImage = `linear-gradient(${trackColor}, ${trackColor}), linear-gradient(${progressColor}, ${progressColor})`;
          activeElement.style.backgroundPosition = "left top, left top";
          activeElement.style.backgroundSize = `3px 100%, 3px ${progressPercent}%`;
          activeElement.style.backgroundRepeat = "no-repeat";
          activeElement.style.paddingBottom = "";
          activeElement.style.marginLeft = "";
          activeElement.style.marginRight = "";
          activeElement.style.color = "";
          activeElement.style.borderLeft = "";
          activeElement.style.borderImage = "";
          activeElement.style.transition = "background-size 120ms linear, color 180ms ease";
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
      findTtsElementByLocation,
      normalizeText,
      theme,
      ttsHighlightStyle,
      ttsHighlightColor,
    ]);

    // 只在段落切换时滚动（不在播放进度更新时滚动）
    useEffect(() => {
      if (!activeTtsParagraph) return;
      if (!autoScrollToActive) return;

      const contents = renditionRef.current?.getContents?.() as
        | Array<{ document?: Document }>
        | undefined;
      const doc = contents?.[0]?.document;
      if (!doc) return;

      const activeElement = doc.querySelector("[data-tts-active='1']") as HTMLElement | null;
      if (!activeElement) return;

      // 滚动到活动段落
      const epubContainer = viewerRef.current?.querySelector(".epub-container") as HTMLElement | null;
      if (epubContainer) {
        let elementOffsetTop = 0;
        let node: HTMLElement | null = activeElement;
        while (node) {
          elementOffsetTop += node.offsetTop;
          node = node.offsetParent as HTMLElement | null;
        }

        const iframeEl = epubContainer.querySelector("iframe") as HTMLElement | null;
        let iframeOffsetTop = 0;
        if (iframeEl) {
          let n: HTMLElement | null = iframeEl;
          while (n && n !== epubContainer) {
            iframeOffsetTop += n.offsetTop;
            n = n.offsetParent as HTMLElement | null;
          }
        }

        const absoluteTop = iframeOffsetTop + elementOffsetTop;
        const targetScrollTop = absoluteTop - epubContainer.clientHeight * 0.25;
        epubContainer.scrollTo({ top: Math.max(0, targetScrollTop), behavior: "smooth" });
      }
    }, [activeTtsParagraphId, activeTtsLocation, activeTtsParagraph, autoScrollToActive]);

    useEffect(() => {
      if (!activeTtsParagraph) return;

      const contents = renditionRef.current?.getContents?.() as
        | Array<{ document?: Document }>
        | undefined;
      const doc = contents?.[0]?.document;
      if (!doc) return;

      const activeElement = doc.querySelector("[data-tts-active='1']") as HTMLElement | null;
      if (!activeElement) return;

      if (ttsHighlightStyle === "indicator") {
        const progressPercent = Math.min(100, Math.max(0, ttsPlaybackProgress * 100));
        const trackColor = `color-mix(in srgb, ${ttsHighlightColor} 14%, transparent)`;
        const progressColor = `color-mix(in srgb, ${ttsHighlightColor} 70%, transparent)`;
        activeElement.style.background = "";
        activeElement.style.backgroundImage = `linear-gradient(${trackColor}, ${trackColor}), linear-gradient(${progressColor}, ${progressColor})`;
        activeElement.style.backgroundPosition = "left top, left top";
        activeElement.style.backgroundSize = `3px 100%, 3px ${progressPercent}%`;
        activeElement.style.backgroundRepeat = "no-repeat";
        activeElement.style.borderLeft = "";
        activeElement.style.borderImage = "";
        activeElement.style.paddingLeft = "12px";
        activeElement.style.transition = "background-size 100ms linear, color 180ms ease";
      } else {
        const rgbColor = ttsHighlightColor.startsWith("#")
          ? ttsHighlightColor
          : "#3b82f6";
        const r = parseInt(rgbColor.slice(1, 3), 16);
        const g = parseInt(rgbColor.slice(3, 5), 16);
        const b = parseInt(rgbColor.slice(5, 7), 16);
        const progressPercent = Math.min(100, Math.max(0, ttsPlaybackProgress * 100));

        activeElement.style.background = `linear-gradient(180deg, 
          rgba(${r}, ${g}, ${b}, 0.12) 0%, 
          rgba(${r}, ${g}, ${b}, 0.08) ${progressPercent}%,
          rgba(${r}, ${g}, ${b}, 0.15) ${progressPercent}%,
          rgba(${r}, ${g}, ${b}, 0.05) 100%
        )`;
      }
    }, [activeTtsParagraphId, activeTtsLocation, activeTtsParagraph, ttsPlaybackProgress, ttsHighlightStyle, ttsHighlightColor]);

    useEffect(() => {
      if (!viewerRef.current) return;

      let cancelled = false;
      let book: Book | null = null;

      const applyTransparentShell = () => {
        if (!viewerRef.current) return;

        viewerRef.current.style.background = "transparent";

        const epubContainer = viewerRef.current.querySelector(".epub-container") as HTMLElement | null;
        if (epubContainer) {
          epubContainer.style.background = "transparent";
          epubContainer.style.boxShadow = "none";
        }

        const iframeEl = viewerRef.current.querySelector("iframe") as HTMLIFrameElement | null;
        if (iframeEl) {
          iframeEl.style.background = "transparent";
          iframeEl.style.boxShadow = "none";
        }
      };

      async function init() {
        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error("Failed to fetch EPUB file");
          const arrayBuffer = await response.arrayBuffer();

          if (cancelled || !viewerRef.current) return;

          book = ePub(arrayBuffer);
          bookRef.current = book;

          book.spine.hooks.serialize.register(
            (output: string, section: { output: string }) => {
              section.output = output.replace(
                /url\s*\(\s*["']?file:\/\/[^)"']+["']?\s*\)/gi,
                'url("data:application/x-empty,")'
              );
            }
          );

          const rendition = book.renderTo(viewerRef.current, {
            width: "100%",
            height: "100%",
            spread: "none",
            flow: "scrolled-doc",
            allowScriptedContent: true,
          });
          renditionRef.current = rendition;
          applyTransparentShell();

          Object.entries(THEME_STYLES).forEach(([name, styles]) => {
            rendition.themes.register(name, styles);
          });

          rendition.themes.select(theme);
          rendition.themes.override("font-size", `${fontSize}px`);

          let displayCfi: string | undefined;
          let initialScrollRatio: number | null = null;
          if (initialLocation) {
            const scrollSepIdx = initialLocation.indexOf("#scroll=");
            if (scrollSepIdx !== -1) {
              displayCfi = initialLocation.slice(0, scrollSepIdx);
              const ratioStr = initialLocation.slice(scrollSepIdx + 8);
              const parsed = parseFloat(ratioStr);
              if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 1) {
                initialScrollRatio = parsed;
              }
            } else {
              displayCfi = initialLocation;
            }
          }
          await book.ready;

          if (cancelled) return;

          rendition.display(displayCfi || undefined);

          rendition.once("displayed", () => {
            applyTransparentShell();
            setIsRenditionReady(true);
            if (initialScrollRatio !== null) {
              setTimeout(() => {
                const epubContainer = viewerRef.current?.querySelector(".epub-container") as HTMLElement | null;
                if (epubContainer) {
                  const scrollRange = epubContainer.scrollHeight - epubContainer.clientHeight;
                  if (scrollRange > 0) {
                    epubContainer.scrollTop = Math.round(initialScrollRatio! * scrollRange);
                  }
                }
              }, 120);
            }
          });

          rendition.on(
            "relocated",
            (location: {
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
            }) => {
              const cfi = location.start.cfi;
              const href = location.start.href;
              
              const book = bookRef.current;
              let overallProgress = 0;
              
              if (book && book.spine && href) {
                const spineItems = (book.spine as unknown as { items: Array<{ href: string; index: number }> }).items || [];
                const totalSpineItems = spineItems.length;
                
                if (totalSpineItems > 0) {
                  const currentItem = spineItems.find((item) => item.href === href);
                  if (currentItem) {
                    const currentIndex = currentItem.index;
                    
                    const epubContainer = viewerRef.current?.querySelector(".epub-container") as HTMLElement | null;
                    let chapterProgress = 0;
                    if (epubContainer) {
                      const scrollRange = epubContainer.scrollHeight - epubContainer.clientHeight;
                      if (scrollRange > 0) {
                        chapterProgress = Math.min(1, Math.max(0, epubContainer.scrollTop / scrollRange));
                      }
                    }
                    
                    overallProgress = (currentIndex + chapterProgress) / totalSpineItems;
                  }
                }
              }
              
              const clampedProgress = Math.min(1, Math.max(0, overallProgress));
              
              currentLocationRef.current = cfi;
              progressRef.current = clampedProgress;

              let scrollRatio: number | undefined;
              const epubContainer = viewerRef.current?.querySelector(".epub-container") as HTMLElement | null;
              if (epubContainer) {
                const scrollRange = epubContainer.scrollHeight - epubContainer.clientHeight;
                if (scrollRange > 0) {
                  scrollRatio = Math.min(1, Math.max(0, epubContainer.scrollTop / scrollRange));
                  scrollRatioRef.current = scrollRatio;
                }
              }

              onLocationChange?.({
                cfi,
                progress: clampedProgress,
                currentPage: location.start.displayed?.page,
                totalPages: location.start.displayed?.total,
                href,
                scrollRatio,
              });
            }
          );

          rendition.on(
            "selected",
            (cfiRange: string, contents: { window: Window }) => {
              if (!onTextSelected) return;
              const selectionText = contents.window.getSelection()?.toString().trim() || "";

              if (selectionText.length > 0) {
                onTextSelected(cfiRange, selectionText);
                return;
              }

              book!.getRange(cfiRange)
                .then((range: Range) => {
                  const text = range.toString().trim();
                  if (text.length > 0) {
                    onTextSelected(cfiRange, text);
                  }
                })
                .catch((error) => {
                  logger.warn("epub-reader", "解析选中文本范围失败", error);
                });
            }
           );

          rendition.on("click", () => {
            if (justSelectedRef.current) {
              justSelectedRef.current = false;
              return;
            }
            onClick?.();
          });

          book.loaded.navigation.then((nav) => {
            function parseTocItems(items: RawTocItem[]): TocItem[] {
              return items.map((item) => ({
                label: item.label.trim(),
                href: item.href,
                id: item.id || undefined,
                ...(item.subitems && item.subitems.length > 0
                  ? { subitems: parseTocItems(item.subitems) }
                  : {}),
              }));
            }
            onTocLoaded?.(parseTocItems(nav.toc as RawTocItem[]));
          });

          book.ready.then(() => {
            book!.locations.generate(1024).then(() => {
              setIsReady(true);
              onReady?.();
            });
          });
        } catch (error) {
          logger.error("epub-reader", "加载EPUB失败", error);
        }
      }

      init();

      return () => {
        cancelled = true;
        setIsReady(false);
        setIsRenditionReady(false);
        highlightIdsRef.current.clear();
        highlightMapRef.current.clear();
        pendingHighlightsRef.current = [];
        renditionRef.current = null;
        bookRef.current = null;
        if (book) book.destroy();
      };
    }, [url, initialLocation]);

    useEffect(() => {
      const rendition = renditionRef.current;
      if (!rendition) return;
      
      const themeStyle = THEME_STYLES[theme];
      
      rendition.themes.override("background", themeStyle.body.background);
      rendition.themes.override("color", themeStyle.body.color);
    }, [theme]);

    useEffect(() => {
      const rendition = renditionRef.current;
      if (!rendition) return;
      rendition.themes.override("font-size", `${fontSize}px`);
    }, [fontSize]);

    const highlightMapRef = useRef<Map<string, string>>(new Map());

    const applyHighlights = useCallback(async () => {
      const rendition = renditionRef.current;
      if (!rendition || !isRenditionReady) return;

      const currentHighlights = pendingHighlightsRef.current;

      highlightMapRef.current.forEach((cfiRange, _id) => {
        try {
          rendition.annotations.remove(cfiRange, "highlight");
        } catch {
        }
      });
      highlightMapRef.current.clear();
      highlightIdsRef.current.clear();

      if (!currentHighlights || currentHighlights.length === 0) return;

      for (const h of currentHighlights) {
        const range = await resolveRangeSafely(h.cfiRange);
        if (!range) {
          continue;
        }

        try {
          rendition.annotations.highlight(
            h.cfiRange,
            { id: h.id },
            undefined,
            undefined,
            { fill: h.color, "fill-opacity": "0.3" }
          );
          highlightIdsRef.current.add(h.id);
          highlightMapRef.current.set(h.id, h.cfiRange);
        } catch {
        }
      }
    }, [isRenditionReady, resolveRangeSafely]);

    useEffect(() => {
      pendingHighlightsRef.current = highlights || [];
      void applyHighlights();
    }, [highlights, applyHighlights]);

    useEffect(() => {
      if (isRenditionReady) {
        void applyHighlights();
      }
    }, [isRenditionReady, applyHighlights]);

    useEffect(() => {
      const rendition = renditionRef.current;
      if (!rendition) return;

      const handleDisplayed = () => {
        if (viewerRef.current) {
          viewerRef.current.style.background = "transparent";
          const epubContainer = viewerRef.current.querySelector(".epub-container") as HTMLElement | null;
          const iframeEl = viewerRef.current.querySelector("iframe") as HTMLIFrameElement | null;
          if (epubContainer) {
            epubContainer.style.background = "transparent";
            epubContainer.style.boxShadow = "none";
          }
          if (iframeEl) {
            iframeEl.style.background = "transparent";
            iframeEl.style.boxShadow = "none";
          }
        }
        void applyHighlights();
      };

      rendition.on("displayed", handleDisplayed);

      return () => {
        rendition.off("displayed", handleDisplayed);
      };
    }, [applyHighlights]);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
      const epubContainer = viewerRef.current?.querySelector(".epub-container") as HTMLElement | null;
      if (!epubContainer) return;

      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        epubContainer.scrollBy({ top: -100, behavior: "smooth" });
      } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        epubContainer.scrollBy({ top: 100, behavior: "smooth" });
      }
    }, []);

    useEffect(() => {
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
      };
    }, [handleKeyDown]);

    useEffect(() => {
      const rendition = renditionRef.current;
      if (!rendition || !isRenditionReady) return;

      const onKeyDown = (e: KeyboardEvent) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
          return;
        }

        const epubContainer = viewerRef.current?.querySelector(".epub-container") as HTMLElement | null;
        if (!epubContainer) return;

        if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
          epubContainer.scrollBy({ top: -100, behavior: "smooth" });
        } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
          epubContainer.scrollBy({ top: 100, behavior: "smooth" });
        }
      };

      rendition.on("keydown", onKeyDown);

      return () => {
        rendition.off("keydown", onKeyDown);
      };
    }, [isRenditionReady]);

          useEffect(() => {
            if (!isRenditionReady) return;
            const epubContainer = viewerRef.current?.querySelector(".epub-container") as HTMLElement | null;
            if (!epubContainer) return;

            let scrollTimer: ReturnType<typeof setTimeout> | null = null;

            const handleScroll = () => {
              const scrollRange = epubContainer.scrollHeight - epubContainer.clientHeight;
              let ratio: number | undefined;
              if (scrollRange > 0) {
                ratio = Math.min(1, Math.max(0, epubContainer.scrollTop / scrollRange));
                scrollRatioRef.current = ratio;
              }

              if (scrollTimer !== null) clearTimeout(scrollTimer);
              scrollTimer = setTimeout(() => {
                scrollTimer = null;
                if (!currentLocationRef.current) return;
                const scrollRange2 = epubContainer.scrollHeight - epubContainer.clientHeight;
                let ratio2: number | undefined;
                if (scrollRange2 > 0) {
                  ratio2 = Math.min(1, Math.max(0, epubContainer.scrollTop / scrollRange2));
                  scrollRatioRef.current = ratio2;
                }
                onLocationChange?.({
                  cfi: currentLocationRef.current,
                  progress: progressRef.current,
                  scrollRatio: ratio2,
                  href: undefined,
                });
              }, 300);
            };

            epubContainer.addEventListener("scroll", handleScroll, { passive: true });

            return () => {
              epubContainer.removeEventListener("scroll", handleScroll);
              if (scrollTimer !== null) clearTimeout(scrollTimer);
            };
          }, [isRenditionReady, onLocationChange]);

    return (
      <div className="relative flex h-full w-full justify-center px-2 sm:px-4 lg:px-6 xl:px-8">
        <div
          ref={viewerRef}
          id="epub-viewer"
          className="h-full flex-none rounded-[24px]"
          style={{ width: pageWidth, maxWidth: "100%" }}
        />
      </div>
    );
  }
);

EpubReader.displayName = "EpubReader";

export default EpubReader;
