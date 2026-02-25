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
  }) => void;
  onTocLoaded?: (toc: TocItem[]) => void;
  onTextSelected?: (cfiRange: string, text: string) => void;
  onReady?: () => void;
  onClick?: () => void;
  highlights?: Array<{ cfiRange: string; color: string; id: string }>;
  activeTtsParagraph?: string;
  ttsPlaybackProgress?: number;
  ttsImmersiveMode?: boolean;
}

export interface EpubReaderRef {
  goToLocation: (cfi: string) => void;
  goToHref: (href: string) => void;
  nextPage: () => void;
  prevPage: () => void;
  getCurrentLocation: () => string | null;
  getProgress: () => number;
  getCurrentText: () => string | null;
  getCurrentParagraphs: () => string[];
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
[data-tts-active='1']::before {
  content: '';
  position: absolute;
  left: -8px;
  top: 0.2em;
  bottom: 0.2em;
  width: 3px;
  border-radius: 2px;
  background: var(--tts-indicator-color, #3b82f6);
  animation: tts-pulse 1.5s ease-in-out infinite;
}
@keyframes tts-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
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
      ttsImmersiveMode = false,
    },
    ref
  ) => {
    const viewerRef = useRef<HTMLDivElement>(null);
    const bookRef = useRef<Book | null>(null);
    const renditionRef = useRef<Rendition | null>(null);
    const currentLocationRef = useRef<string | null>(null);
    const progressRef = useRef<number>(0);
    const highlightIdsRef = useRef<Set<string>>(new Set());
    const [isReady, setIsReady] = useState(false);
    const [isRenditionReady, setIsRenditionReady] = useState(false);
    const pendingHighlightsRef = useRef<Array<{ cfiRange: string; color: string; id: string }>>([]);
    const justSelectedRef = useRef(false);
    const wasImmersiveModeRef = useRef(false);

    // ---- Expose API via ref ----
    useImperativeHandle(ref, () => ({
      goToLocation(cfi: string) {
        renditionRef.current?.display(cfi);
      },
      goToHref(href: string) {
        renditionRef.current?.display(href);
      },
      nextPage() {
        renditionRef.current?.next();
      },
      prevPage() {
        renditionRef.current?.prev();
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
        const viewportWidth = content?.window?.innerWidth || window.innerWidth;
        const viewportHeight = content?.window?.innerHeight || window.innerHeight;

        const normalizeParagraph = (text: string) => text.replace(/\s+/g, " ").trim();
        const semanticTags = new Set([
          "p",
          "li",
          "blockquote",
          "h1",
          "h2",
          "h3",
          "h4",
          "h5",
          "h6",
          "pre",
        ]);

        const visibleParagraphs: string[] = [];

        const isRectVisible = (rect: DOMRect) =>
          rect.right > 0 &&
          rect.left < viewportWidth &&
          rect.bottom > 0 &&
          rect.top < viewportHeight;

        const isElementOnCurrentViewport = (element: HTMLElement) => {
          const rects = Array.from(element.getClientRects());

          for (const rect of rects) {
            if (!isRectVisible(rect)) continue;

            const hitX = Math.min(
              viewportWidth - 1,
              Math.max(1, Math.floor(rect.left + Math.min(rect.width / 2, 24)))
            );
            const hitY = Math.min(
              viewportHeight - 1,
              Math.max(1, Math.floor(rect.top + Math.min(rect.height / 2, 12)))
            );
            const hit = doc.elementFromPoint(hitX, hitY) as HTMLElement | null;
            if (!hit) continue;

            if (element === hit || element.contains(hit)) {
              return true;
            }
          }

          return false;
        };

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

        // Fallback: when no node intersects viewport (timing/layout edge case),
        // pick nodes closest to current page center instead of falling back to
        // the whole chapter.
        const viewportCenterX = viewportWidth / 2;
        const nearestParagraphs = elementArray
          .map((element) => {
            const rects = Array.from(element.getClientRects());
            const centerX =
              rects.length > 0
                ? rects.reduce((sum, rect) => sum + (rect.left + rect.width / 2), 0) /
                  rects.length
                : viewportCenterX;
            return {
              distance: Math.abs(centerX - viewportCenterX),
              text: normalizeParagraph(element.textContent || ""),
            };
          })
          .filter((item) => item.text.length > 0 && item.text.length <= 800)
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 24)
          .map((item) => item.text);

        if (nearestParagraphs.length > 0) {
          return nearestParagraphs;
        }

        return [];
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

    // Inject TTS indicator CSS into iframe
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
      });

      doc.body.removeAttribute("data-tts-immersive");
      
      // Only clear immersive mode styles if we were previously in immersive mode
      if (wasImmersiveModeRef.current) {
        doc.body.style.display = "";
        doc.body.style.alignItems = "";
        doc.body.style.justifyContent = "";
        doc.body.style.minHeight = "";
        doc.body.style.boxSizing = "";
        doc.body.style.padding = "";
        doc.body.style.margin = "";
        wasImmersiveModeRef.current = false;
      }

      if (!activeTtsParagraph) return;

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

      if (ttsImmersiveMode) {
        wasImmersiveModeRef.current = true;
        doc.body.setAttribute("data-tts-immersive", "1");
        doc.body.style.display = "flex";
        doc.body.style.alignItems = "center";
        doc.body.style.justifyContent = "center";
        doc.body.style.minHeight = "100vh";
        doc.body.style.boxSizing = "border-box";
        doc.body.style.padding = "min(12vh, 96px) 24px";
        doc.body.style.margin = "0";

        candidates.forEach((element) => {
          if (element === matchedElement) return;
          (element as HTMLElement).style.display = "none";
        });

        activeElement.style.display = "block";
        activeElement.style.maxWidth = "48rem";
        activeElement.style.width = "100%";
        activeElement.style.padding = "0";
        activeElement.style.borderRadius = "0";
        activeElement.style.maxHeight = "76vh";
        activeElement.style.overflowY = "auto";
        activeElement.style.border = "0";
        activeElement.style.boxShadow = "none";
        activeElement.style.fontSize = "1.24em";
        activeElement.style.lineHeight = "1.95";
        activeElement.style.margin = "0";

      } else {
        // Non-immersive mode: no automatic scrolling
      }
    }, [activeTtsParagraph, normalizeText, theme, ttsImmersiveMode]);

    useEffect(() => {
      if (!ttsImmersiveMode || !activeTtsParagraph) return;

      const contents = renditionRef.current?.getContents?.() as
        | Array<{ document?: Document }>
        | undefined;
      const doc = contents?.[0]?.document;
      if (!doc?.body) return;

      const activeElement = doc.body.querySelector("[data-tts-active='1']") as
        | HTMLElement
        | null;
      if (!activeElement) return;

      const targetTop = getTeleprompterScrollTop(activeElement, ttsPlaybackProgress);
      const currentTop = activeElement.scrollTop;
      const delta = targetTop - currentTop;
      const nextTop =
        Math.abs(delta) < 0.5
          ? targetTop
          : currentTop + delta * TELEPROMPTER_FOLLOW_FACTOR;
      activeElement.scrollTop = nextTop;
    }, [
      activeTtsParagraph,
      getTeleprompterScrollTop,
      ttsImmersiveMode,
      ttsPlaybackProgress,
    ]);

    // ---- Initialize book & rendition ----
    useEffect(() => {
      if (!viewerRef.current) return;

      let cancelled = false;
      let book: Book | null = null;

      // Fetch the EPUB as ArrayBuffer first, then pass to epubjs
      // This prevents epubjs from treating the URL as a directory base path
      async function init() {
        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error("Failed to fetch EPUB file");
          const arrayBuffer = await response.arrayBuffer();

          if (cancelled || !viewerRef.current) return;

          book = ePub(arrayBuffer as unknown as string);
          bookRef.current = book;

          // Strip file:// references BEFORE content is injected into iframe
          // Some EPUBs (e.g. from Kindle) contain file:///mnt/us/... font paths
          // that browsers block. We intercept the serialized HTML string and
          // remove all url() values pointing to file:// resources.
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
            allowScriptedContent: true,
          });
          renditionRef.current = rendition;

          // Register all themes
          Object.entries(THEME_STYLES).forEach(([name, styles]) => {
            rendition.themes.register(name, styles);
          });

          // Apply initial theme and font size
          rendition.themes.select(theme);
          rendition.themes.override("font-size", `${fontSize}px`);

          // Display the book at initial location or beginning
          rendition.display(initialLocation || undefined);

          // Mark rendition as ready once the first section is displayed,
          // so highlights can be applied immediately without waiting for
          // the expensive locations.generate() call.
          rendition.once("displayed", () => {
            setIsRenditionReady(true);
          });

          // ---- Location change handler ----
          rendition.on(
            "relocated",
            (location: {
              start: {
                cfi: string;
                percentage: number;
                displayed: { page: number; total: number };
                href: string;
              };
            }) => {
              const cfi = location.start.cfi;
              const progress = location.start.percentage ?? 0;
              currentLocationRef.current = cfi;
              progressRef.current = progress;

              onLocationChange?.({
                cfi,
                progress,
                currentPage: location.start.displayed?.page,
                totalPages: location.start.displayed?.total,
                href: location.start.href,
              });
            }
          );

          // ---- Text selection handler ----
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

          // ---- Click handler for toolbar toggle ----
          rendition.on("click", () => {
            if (justSelectedRef.current) {
              justSelectedRef.current = false;
              return;
            }
            onClick?.();
          });

          // ---- TOC parsing (with nested subitems support) ----
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

          // ---- Ready callback ----
          book.ready.then(() => {
            // Generate locations for progress tracking
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

      // ---- Cleanup ----
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
      // Only re-init when the url changes
      // Only re-init when the url changes
    }, [url]);

    // ---- Theme updates ----
    useEffect(() => {
      const rendition = renditionRef.current;
      if (!rendition) return;
      rendition.themes.select(theme);
    }, [theme]);

    // ---- Font size updates ----
    useEffect(() => {
      const rendition = renditionRef.current;
      if (!rendition) return;
      rendition.themes.override("font-size", `${fontSize}px`);
    }, [fontSize]);

    // ---- Highlights ----
    // We store a map of id -> cfiRange so we can remove by cfiRange (which is
    // what epubjs annotations.remove() actually requires).
    const highlightMapRef = useRef<Map<string, string>>(new Map());

    // Apply highlights function – always re-applies all highlights because
    // epubjs loses SVG annotations when re-rendering a section (chapter switch).
    const applyHighlights = useCallback(() => {
      const rendition = renditionRef.current;
      if (!rendition || !isRenditionReady) return;

      const currentHighlights = pendingHighlightsRef.current;

      // Remove all previously applied highlights first – epubjs requires the
      // cfiRange (not a custom id) as the first argument to annotations.remove().
      highlightMapRef.current.forEach((cfiRange, _id) => {
        try {
          rendition.annotations.remove(cfiRange, "highlight");
        } catch {
          // ignore – may already be gone after section switch
        }
      });
      highlightMapRef.current.clear();
      highlightIdsRef.current.clear();

      if (!currentHighlights || currentHighlights.length === 0) return;

      // Add all highlights fresh
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
          // CFI may not be in current section – this is expected
        }
      });
    }, [isRenditionReady]);

    // Update pending highlights when props change (including when cleared)
    useEffect(() => {
      pendingHighlightsRef.current = highlights || [];
      applyHighlights();
    }, [highlights, applyHighlights]);

    // Apply highlights when rendition becomes ready
    useEffect(() => {
      if (isRenditionReady) {
        applyHighlights();
      }
    }, [isRenditionReady, applyHighlights]);

    // Re-apply highlights after each section is rendered
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

    // ---- Keyboard navigation ----
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
      const rendition = renditionRef.current;
      if (!rendition) return;

      // Only handle if arrow keys and not inside an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === "ArrowLeft") {
        rendition.prev();
      } else if (e.key === "ArrowRight") {
        rendition.next();
      }
    }, []);

    useEffect(() => {
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
      };
    }, [handleKeyDown]);

    // Also bind keyboard events inside the rendition iframe
    useEffect(() => {
      const rendition = renditionRef.current;
      if (!rendition) return;

      const onKeyDown = (e: KeyboardEvent) => {
        // Only handle if arrow keys and not inside an input
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
          return;
        }

        if (e.key === "ArrowLeft") {
          rendition.prev();
        } else if (e.key === "ArrowRight") {
          rendition.next();
        }
      };

      rendition.on("keydown", onKeyDown);

      return () => {
        rendition.off("keydown", onKeyDown);
      };
    }, [url]);

    return (
      <div className="relative h-full w-full">
        <div ref={viewerRef} id="epub-viewer" className="h-full w-full" />
      </div>
    );
  }
);

EpubReader.displayName = "EpubReader";

export default EpubReader;
