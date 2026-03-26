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
  flipMode?: "scroll" | "page";
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
  ttsPlaybackProgress?: number;
  ttsHighlightStyle?: "background" | "indicator";
  ttsHighlightColor?: string;
  autoScrollToActive?: boolean;
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
  getProgress: () => number;
  getCurrentText: () => string | null;
  getCurrentParagraphs: () => string[];
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
  { body: Record<string, string> }
> = {
  light: {
    body: {
      background: "hsl(0 0% 100%)",
      color: "hsl(240 10% 3.9%)",
    },
  },
  dark: {
    body: {
      background: "hsl(240 10% 3.9%)",
      color: "hsl(0 0% 98%)",
    },
  },
  sepia: {
    body: {
      background: "#F5F1E8",
      color: "#5B4636",
    },
  },
};

const TTS_INDICATOR_CSS = `
[data-tts-active='1'] {
  position: relative;
}
[data-tts-active='1'] .tts-progress-track {
  position: absolute;
  left: -10px;
  top: 0.15em;
  bottom: 0.15em;
  width: 3px;
  border-radius: 3px;
  background: color-mix(in srgb, var(--tts-indicator-color, #3b82f6) 25%, transparent);
  opacity: 0.5;
}
[data-tts-active='1'] .tts-progress-fill {
  position: absolute;
  left: -10px;
  top: 0.15em;
  width: 3px;
  border-radius: 3px;
  background: var(--tts-indicator-color, #3b82f6);
  box-shadow: 
    0 0 0 1px var(--tts-indicator-color, #3b82f6),
    0 0 8px color-mix(in srgb, var(--tts-indicator-color, #3b82f6) 60%, transparent);
  transition: height 0.12s ease-out, opacity 0.15s ease;
}
[data-tts-active='1']::before {
  content: '';
  position: absolute;
  left: -14px;
  top: 50%;
  transform: translateY(-50%);
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--tts-indicator-color, #3b82f6);
  opacity: 0;
  transition: opacity 0.3s ease;
  box-shadow: 0 0 6px var(--tts-indicator-color, #3b82f6);
}
[data-tts-active='1'] .tts-progress-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 3px;
  background: linear-gradient(180deg, 
    color-mix(in srgb, white 30%, transparent) 0%, 
    transparent 50%,
    color-mix(in srgb, black 20%, transparent) 100%
  );
}
@keyframes tts-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.85; transform: scale(1.02); }
}
`;

const EpubReader = forwardRef<EpubReaderRef, EpubReaderProps>(
  (
    {
      url,
      initialLocation,
      fontSize = 16,
      pageWidth = 800,
      theme = "light",
      flipMode = "scroll",
      onLocationChange,
      onTocLoaded,
      onTextSelected,
      onReady,
      onClick,
      highlights,
      activeTtsParagraph,
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

    useImperativeHandle(ref, () => ({
      goToLocation(cfi: string) {
        renditionRef.current?.display(cfi);
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
          | Array<{ document?: Document; window?: Window }>
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

        // 在分页模式下，获取当前显示页面的所有段落
        const epubContainer = viewerRef.current?.querySelector(".epub-container") as HTMLElement | null;
        const isPaginated = epubContainer?.scrollHeight === epubContainer?.clientHeight;
        
        if (isPaginated) {
          // 分页模式下，获取当前屏幕可见区域内的段落
          const visibleParagraphs: string[] = [];
          
          for (const element of elementArray) {
            const rects = Array.from(element.getClientRects());
            let isVisible = false;
            
            for (const rect of rects) {
              if (
                rect.bottom > 0 &&
                rect.top < viewportHeight &&
                rect.right > 0 &&
                rect.left < viewportWidth
              ) {
                isVisible = true;
                break;
              }
            }
            
            if (isVisible) {
              const text = normalizeParagraph(element.textContent || "");
              if (text.length > 0) {
                visibleParagraphs.push(text);
              }
            }
          }
          
          if (visibleParagraphs.length > 0) {
            return visibleParagraphs;
          }
          
          // 如果没有可见段落，返回最近的段落
          const nearestParagraphs = elementArray
            .map((element) => {
              const rects = Array.from(element.getClientRects());
              if (rects.length === 0) {
                return { distance: Infinity, text: normalizeParagraph(element.textContent || "") };
              }
              const minDistance = rects.reduce((best, rect) => {
                const rectCenterY = rect.top + rect.height / 2;
                return Math.min(best, Math.abs(rectCenterY - viewportHeight / 2));
              }, Infinity);
              return {
                distance: minDistance,
                text: normalizeParagraph(element.textContent || ""),
              };
            })
            .filter((item) => item.text.length > 0 && item.text.length <= 800 && item.distance < viewportHeight)
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 24)
            .map((item) => item.text);

          if (nearestParagraphs.length > 0) {
            return nearestParagraphs;
          }
          
          return [];
        }

        // 滚动模式下的原有逻辑
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

        const visibleParagraphs: string[] = [];

        for (const element of elementArray) {
          if (isElementOnCurrentViewport(element)) {
            const text = normalizeParagraph(element.textContent || "");
            if (text.length > 0) {
              visibleParagraphs.push(text);
            }
          }
        }

        if (visibleParagraphs.length > 0) {
          return visibleParagraphs;
        }

        const pageCenterY = containerScrollTop + viewportHeight / 2;
        const nearestParagraphs = elementArray
          .map((element) => {
            const rects = Array.from(element.getClientRects());
            if (rects.length === 0) {
              return { distance: Infinity, text: normalizeParagraph(element.textContent || "") };
            }
            const minDistance = rects.reduce((best, rect) => {
              const rectCenterY = rect.top + rect.height / 2;
              return Math.min(best, Math.abs(rectCenterY - pageCenterY));
            }, Infinity);
            return {
              distance: minDistance,
              text: normalizeParagraph(element.textContent || ""),
            };
          })
          .filter((item) => item.text.length > 0 && item.text.length <= 800 && item.distance < viewportHeight)
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 24)
          .map((item) => item.text);

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

    useEffect(() => {
      const contents = renditionRef.current?.getContents?.() as
        | Array<{ document?: Document }>
        | undefined;
      const doc = contents?.[0]?.document;
      if (!doc) return;

      let styleEl = doc.getElementById("tts-indicator-style");
      if (!styleEl) {
        styleEl = doc.createElement("style");
        styleEl.id = "tts-indicator-style";
        styleEl.textContent = TTS_INDICATOR_CSS;
        doc.head.appendChild(styleEl);
      }
    }, [isRenditionReady, activeTtsParagraph]);

    useEffect(() => {
      const contents = renditionRef.current?.getContents?.() as
        | Array<{ document?: Document }>
        | undefined;
      const doc = contents?.[0]?.document;
      if (!doc?.body) return;

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

        const progressTrack = element.querySelector(".tts-progress-track");
        const progressFill = element.querySelector(".tts-progress-fill");
        if (progressTrack) progressTrack.remove();
        if (progressFill) progressFill.remove();
      });

      doc.body.removeAttribute("data-tts-immersive");

      if (!activeTtsParagraph) {
        return;
      }

      const needle = normalizeText(activeTtsParagraph).slice(0, 80);
      if (!needle) return;

      const candidates = doc.body.querySelectorAll(
        "p, li, blockquote, h1, h2, h3, h4, h5, h6"
      );

      candidates.forEach((element) => {
        const node = element as HTMLElement;
        node.style.opacity = "";
        node.style.display = "";
      });

      const getCommonPrefixLength = (a: string, b: string) => {
        const limit = Math.min(a.length, b.length);
        let count = 0;
        while (count < limit && a[count] === b[count]) {
          count += 1;
        }
        return count;
      };

      let matchedElement: Element | null = null;
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

      if (!matchedElement) return;

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
        activeElement.style.backgroundColor = "";
        activeElement.style.borderRadius = "";
        activeElement.style.padding = "";
        activeElement.style.boxShadow = "";
        activeElement.style.backgroundImage = "";
        activeElement.style.backgroundPosition = "";
        activeElement.style.backgroundSize = "";
        activeElement.style.backgroundRepeat = "";
        activeElement.style.paddingBottom = "";
        activeElement.style.marginLeft = "";
        activeElement.style.marginRight = "";
        activeElement.style.color = "";
        activeElement.style.setProperty("--tts-indicator-color", ttsHighlightColor);
      }
    }, [activeTtsParagraph, normalizeText, theme, ttsHighlightStyle, ttsHighlightColor]);

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
    }, [activeTtsParagraph, autoScrollToActive]);

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
        let progressFill = activeElement.querySelector(".tts-progress-fill") as HTMLElement | null;
        let progressTrack = activeElement.querySelector(".tts-progress-track") as HTMLElement | null;

        if (!progressTrack) {
          progressTrack = doc.createElement("div");
          progressTrack.className = "tts-progress-track";
          activeElement.appendChild(progressTrack);
        }

        if (!progressFill) {
          progressFill = doc.createElement("div");
          progressFill.className = "tts-progress-fill";
          activeElement.appendChild(progressFill);
        }

        const progressPercent = Math.min(100, Math.max(0, ttsPlaybackProgress * 100));
        const trackHeight = activeElement.offsetHeight - parseFloat(getComputedStyle(activeElement).fontSize) * 0.4;
        const fillHeight = trackHeight * (progressPercent / 100);
        progressFill.style.height = `${Math.max(0, fillHeight)}px`;
        progressFill.style.setProperty("--tts-indicator-color", ttsHighlightColor);
      } else {
        const progressTrack = activeElement.querySelector(".tts-progress-track");
        const progressFill = activeElement.querySelector(".tts-progress-fill");
        if (progressTrack) progressTrack.remove();
        if (progressFill) progressFill.remove();
      }
    }, [activeTtsParagraph, ttsPlaybackProgress, ttsHighlightStyle, ttsHighlightColor]);

    useEffect(() => {
      if (!viewerRef.current) return;

      let cancelled = false;
      let book: Book | null = null;

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
            (cfiRange: string, _contents: { window: Window }) => {
              if (!onTextSelected) return;
              book!.getRange(cfiRange).then((range: Range) => {
                const text = range.toString();
                if (text.length > 0) {
                  onTextSelected(cfiRange, text);
                }
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

    const applyHighlights = useCallback(() => {
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

      currentHighlights.forEach((h) => {
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
      });
    }, [isRenditionReady]);

    useEffect(() => {
      pendingHighlightsRef.current = highlights || [];
      applyHighlights();
    }, [highlights, applyHighlights]);

    useEffect(() => {
      if (isRenditionReady) {
        applyHighlights();
      }
    }, [isRenditionReady, applyHighlights]);

    useEffect(() => {
      const rendition = renditionRef.current;
      if (!rendition) return;

      const handleDisplayed = () => {
        applyHighlights();
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
      <div className="relative h-full w-full flex justify-center">
        <div ref={viewerRef} id="epub-viewer" className="h-full" style={{ width: pageWidth, maxWidth: "100%" }} />
      </div>
    );
  }
);

EpubReader.displayName = "EpubReader";

export default EpubReader;
