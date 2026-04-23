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
import type { TocItem } from "@/types/reader";
import { EpubContext } from "@/lib/epub-context";
import {
  prepareParagraphs,
  buildPositionIndex,
  findVisibleParagraphs,
  ParagraphLayout,
  calculateLineHeight,
} from "@/lib/pretext-layout";
import { THEME_STYLES } from "./epub-styles";
import { useEpubResponsiveWidth } from "./hooks/useEpubResponsiveWidth";
import { findTextRange } from "@/lib/tts-utils";

interface EpubReaderProps {
  url: string;
  initialLocation?: string;
  fontSize?: number;
  fontFamily?: string;
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
  ttsHighlightColor?: string;
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

export { type TocItem };

interface RawTocItem {
  label: string;
  href: string;
  id?: string;
  subitems?: RawTocItem[];
}

const FONT_FAMILY_MAP: Record<string, string> = {
  system: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif',
  serif: '"Noto Serif SC", "Source Han Serif SC", "Songti SC", "SimSun", "STSong", serif',
  sans: '"Noto Sans SC", "Source Han Sans SC", "Heiti SC", "SimHei", "STHeiti", sans-serif',
  kaiti: '"LXGW WenKai", "Kaiti SC", "STKaiti", "KaiTi", "BiauKai", serif',
};

const getFontFamily = (fontFamily?: string) => {
  return FONT_FAMILY_MAP[fontFamily || "system"] || FONT_FAMILY_MAP.system;
};

const EpubReader = forwardRef<EpubReaderRef, EpubReaderProps>(
  (
    {
      url,
      initialLocation,
      fontSize = 16,
      fontFamily = "system",
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
      ttsHighlightColor = "#3b82f6",
    },
    ref
  ) => {
    const pageWidth = useEpubResponsiveWidth();

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

    const highlightSpanRef = useRef<HTMLElement | null>(null);
    const epubContextRef = useRef<EpubContext>(new EpubContext());

    const paragraphLayoutsRef = useRef<ParagraphLayout[]>([]);
    const positionIndexRef = useRef<Array<{
      id: string;
      startY: number;
      endY: number;
      height: number;
      index: number;
    }>>([]);
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
      (
        doc: Document,
        containerWidth: number
      ) => {
        const nodes = doc.body.querySelectorAll(
          "p, li, blockquote, h1, h2, h3, h4, h5, h6"
        );

        const paragraphs: Array<{ id: string; text: string; location?: string }> = [];

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
      [fontSize, buildParagraphId]
    );

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
        const container = epubContextRef.current.getScrollContainer();
        container?.scrollBy({ top: amount, behavior: "smooth" });
      },
      scrollUp(amount = 300) {
        const container = epubContextRef.current.getScrollContainer();
        container?.scrollBy({ top: -amount, behavior: "smooth" });
      },
      getCurrentLocation() {
        return currentLocationRef.current;
      },
      getActiveTtsLocation() {
        const activeElement = epubContextRef.current.getActiveTtsElement();
        if (!activeElement) return null;
        return epubContextRef.current.getCfiFromNode(activeElement);
      },
      getProgress() {
        return progressRef.current;
      },
      getCurrentText() {
        const body = epubContextRef.current.getBody();
        const text = body?.innerText?.trim();
        return text && text.length > 0 ? text : null;
      },
      getCurrentParagraphs() {
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
      },
      scrollToActiveParagraph() {
        const ctx = epubContextRef.current;
        const activeElement = ctx.getActiveTtsElement();
        if (!activeElement) return;

        ctx.scrollToTop(activeElement);
      },
    }));

    const normalizeText = useCallback((text: string) => {
      return text.replace(/\s+/g, "").trim();
    }, []);

    const findParagraphByPretext = useCallback(
      (
        doc: Document,
        searchText: string
      ): HTMLElement | null => {
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

        return doc.querySelector(`[data-reader-paragraph-id="${bestLayout.id}"]`) as HTMLElement | null;
      },
      [normalizeText]
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
      [resolveRangeSafely]
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
      findTtsElementByLocation,
      findTextRange,
      normalizeText,
      findParagraphByPretext,
      theme,
      ttsHighlightColor,
    ]);

    useEffect(() => {
      if (!activeTtsParagraph) return;

      const ctx = epubContextRef.current;

      const doScroll = () => {
        // 优先滚动到当前朗读的句子（句子级别的高亮 span）
        const sentenceSpan = highlightSpanRef.current;
        if (sentenceSpan && ctx.getDocument()?.body?.contains(sentenceSpan)) {
          ctx.scrollToElement(sentenceSpan, 0.3);
          return;
        }

        // 如果没有句子级别 span，滚动到段落
        const activeElement = ctx.getActiveTtsElement();
        if (!activeElement) return;

        ctx.scrollToElement(activeElement, 0.25);
      };

      // 立即尝试滚动（如果 span 已同步创建）
      doScroll();

      // 短暂延迟后再次尝试（处理异步创建 span 的情况）
      const timeoutId = setTimeout(doScroll, 100);

      return () => clearTimeout(timeoutId);
    }, [activeTtsParagraph]);

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
          epubContextRef.current.setRendition(rendition);
          epubContextRef.current.setContainer(viewerRef.current);
          applyTransparentShell();

          Object.entries(THEME_STYLES).forEach(([name, styles]) => {
            rendition.themes.register(name, styles);
          });

          rendition.themes.select(theme);
          rendition.themes.override("font-size", `${fontSize}px`);
          rendition.themes.override("font-family", getFontFamily(fontFamily));

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
            const iframeEl = viewerRef.current?.querySelector("iframe") as HTMLIFrameElement | null;
            const doc = iframeEl?.contentDocument;
            if (doc) {
              const style = doc.createElement("style");
              style.textContent = `
                sup img {
                  width: 1.2em !important;
                  height: auto !important;
                  vertical-align: sub;
                }
                sub img {
                  width: 1.2em !important;
                  height: auto !important;
                  vertical-align: super;
                }
              `;
              doc.head.appendChild(style);
            }
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

      const doc = epubContextRef.current.getDocument();
      const { width: containerWidth } = epubContextRef.current.getViewportSize();
      if (doc?.body) {
        buildParagraphLayoutIndex(doc, containerWidth);
      }
    }, [fontSize, buildParagraphLayoutIndex]);

    useEffect(() => {
      const rendition = renditionRef.current;
      if (!rendition) return;
      rendition.themes.override("font-family", getFontFamily(fontFamily));
    }, [fontFamily]);

    useEffect(() => {
      if (!isRenditionReady) return;

      epubContextRef.current.applyMaxWidthToChildren(pageWidth);
    }, [pageWidth, isRenditionReady]);

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
    }, [applyHighlights, pageWidth, buildParagraphLayoutIndex]);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const container = epubContextRef.current.getScrollContainer();
      if (!container) return;

      if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        container.scrollBy({ top: -100, behavior: "smooth" });
      } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        container.scrollBy({ top: 100, behavior: "smooth" });
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

        const container = epubContextRef.current.getScrollContainer();
        if (!container) return;

        if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
          container.scrollBy({ top: -100, behavior: "smooth" });
        } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
          container.scrollBy({ top: 100, behavior: "smooth" });
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
          style={{ width: `${pageWidth}%` }}
        />
      </div>
    );
  }
);

EpubReader.displayName = "EpubReader";

export default EpubReader;
