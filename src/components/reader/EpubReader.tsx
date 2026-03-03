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

interface EpubReaderProps {
  url: string;
  initialLocation?: string;
  fontSize?: number;
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
  ttsPlaybackProgress?: number;
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
      background: "#ffffff",
      color: "#000000",
    },
  },
  dark: {
    body: {
      background: "#1a1a2e",
      color: "#eeeeee",
    },
  },
  sepia: {
    body: {
      background: "#f4ecd8",
      color: "#5b4636",
    },
  },
};

const TELEPROMPTER_FOLLOW_FACTOR = 0.16;
const TELEPROMPTER_VIEWPORT_ANCHOR = 0.42;

const TTS_INDICATOR_CSS = `
[data-tts-active='1'] {
  position: relative;
}
[data-tts-active='1'] .tts-progress-track {
  position: absolute;
  left: -8px;
  top: 0.2em;
  bottom: 0.2em;
  width: 4px;
  border-radius: 2px;
  background: rgba(148, 163, 184, 0.3);
}
[data-tts-active='1'] .tts-progress-fill {
  position: absolute;
  left: -8px;
  top: 0.2em;
  width: 4px;
  border-radius: 2px;
  background: var(--tts-indicator-color, #3b82f6);
  animation: tts-pulse 1.5s ease-in-out infinite;
  box-shadow: 0 0 4px var(--tts-indicator-color, #3b82f6);
  transition: height 0.1s ease-out;
}
@keyframes tts-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
`;

const EpubReader = forwardRef<EpubReaderRef, EpubReaderProps>(
  (
    {
      url,
      initialLocation,
      fontSize = 16,
      theme = "light",
      onLocationChange,
      onTocLoaded,
      onTextSelected,
      onReady,
      onClick,
      highlights,
      activeTtsParagraph,
      ttsPlaybackProgress = 0,
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
    const [isReady, setIsReady] = useState(false);
    const [isRenditionReady, setIsRenditionReady] = useState(false);
    const pendingHighlightsRef = useRef<Array<{ cfiRange: string; color: string; id: string }>>([]);
    const justSelectedRef = useRef(false);
    const activeParagraphAbsTopRef = useRef<number | null>(null);
    const lerpRafIdRef = useRef<number | null>(null);
    const smoothScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        renditionRef.current?.next();
      },
      prevPage() {
        renditionRef.current?.prev();
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
        const targetScrollTop = absoluteTop - epubContainer.clientHeight * 0.25;
        epubContainer.scrollTo({ top: Math.max(0, targetScrollTop), behavior: "smooth" });
      },
    }));

    const normalizeText = useCallback((text: string) => {
      return text.replace(/\s+/g, "").trim();
    }, []);

    const getTeleprompterScrollTop = useCallback(
      (element: HTMLElement, progress: number) => {
        const scrollRange = Math.max(0, element.scrollHeight - element.clientHeight);
        if (scrollRange <= 0) return 0;

        const clampedProgress = Math.min(1, Math.max(0, progress));
        const leadIn = 0.08;
        const leadOut = 0.94;

        if (clampedProgress <= leadIn) return 0;
        if (clampedProgress >= leadOut) return scrollRange;

        const normalized = (clampedProgress - leadIn) / (leadOut - leadIn);
        const eased = normalized * normalized * (3 - 2 * normalized);
        const contentPosition = eased * element.scrollHeight;
        const anchoredTop = contentPosition - element.clientHeight * TELEPROMPTER_VIEWPORT_ANCHOR;
        return Math.min(scrollRange, Math.max(0, anchoredTop));
      },
      []
    );

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

        const progressTrack = element.querySelector(".tts-progress-track");
        const progressFill = element.querySelector(".tts-progress-fill");
        if (progressTrack) progressTrack.remove();
        if (progressFill) progressFill.remove();
      });

      doc.body.removeAttribute("data-tts-immersive");

      if (!activeTtsParagraph) {
        activeParagraphAbsTopRef.current = null;
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
      activeElement.style.backgroundColor = "";
      activeElement.style.transition = "all 220ms ease";
      activeElement.style.opacity = "1";
      activeElement.style.position = "relative";
      activeElement.style.setProperty("--tts-indicator-color", "var(--primary, #3b82f6)");

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
        activeParagraphAbsTopRef.current = absoluteTop;

        if (lerpRafIdRef.current !== null) {
          cancelAnimationFrame(lerpRafIdRef.current);
          lerpRafIdRef.current = null;
        }
        if (smoothScrollTimerRef.current !== null) {
          clearTimeout(smoothScrollTimerRef.current);
          smoothScrollTimerRef.current = null;
        }

        const targetScrollTop = absoluteTop - epubContainer.clientHeight * 0.25;
        epubContainer.scrollTo({ top: Math.max(0, targetScrollTop), behavior: "smooth" });
      }
    }, [activeTtsParagraph, normalizeText, theme]);

    useEffect(() => {
      if (!activeTtsParagraph) return;

      const contents = renditionRef.current?.getContents?.() as
        | Array<{ document?: Document }>
        | undefined;
      const doc = contents?.[0]?.document;
      if (!doc) return;

      const activeElement = doc.querySelector("[data-tts-active='1']") as HTMLElement | null;
      if (!activeElement) return;

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

      const epubContainer = viewerRef.current?.querySelector(".epub-container") as HTMLElement | null;
      if (epubContainer && activeParagraphAbsTopRef.current !== null) {
        const paragraphHeight = activeElement.offsetHeight;
        if (paragraphHeight > epubContainer.clientHeight * 0.8) {
          const progressY = paragraphHeight * ttsPlaybackProgress;
          const targetScrollTop =
            activeParagraphAbsTopRef.current + progressY - epubContainer.clientHeight * 0.35;
          const clampedTarget = Math.max(0, targetScrollTop);

          if (lerpRafIdRef.current !== null) {
            cancelAnimationFrame(lerpRafIdRef.current);
            lerpRafIdRef.current = null;
          }

          if (smoothScrollTimerRef.current !== null) {
            clearTimeout(smoothScrollTimerRef.current);
          }
          smoothScrollTimerRef.current = setTimeout(() => {
            smoothScrollTimerRef.current = null;
            const LERP_FACTOR = 0.1;
            const step = () => {
              if (!epubContainer) return;
              const current = epubContainer.scrollTop;
              const diff = clampedTarget - current;
              if (Math.abs(diff) < 0.5) {
                epubContainer.scrollTop = clampedTarget;
                lerpRafIdRef.current = null;
                return;
              }
              epubContainer.scrollTop = current + diff * LERP_FACTOR;
              lerpRafIdRef.current = requestAnimationFrame(step);
            };
            lerpRafIdRef.current = requestAnimationFrame(step);
          }, 400);
        }
      }
    }, [activeTtsParagraph, ttsPlaybackProgress]);

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
                const spineItems = (book.spine as any).items || [];
                const totalSpineItems = spineItems.length;
                
                if (totalSpineItems > 0) {
                  const currentItem = spineItems.find((item: any) => item.href === href);
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
          console.error("Failed to load EPUB:", error);
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
    }, [url]);

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
      <div className="relative h-full w-full">
        <div ref={viewerRef} id="epub-viewer" className="h-full w-full" />
      </div>
    );
  }
);

EpubReader.displayName = "EpubReader";

export default EpubReader;
