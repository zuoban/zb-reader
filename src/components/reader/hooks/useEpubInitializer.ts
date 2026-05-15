"use client";

import { useEffect, useRef } from "react";
import type { MutableRefObject, RefObject } from "react";
import type { Book, Rendition } from "epubjs";
import { logger } from "@/lib/logger";
import { EpubContext } from "@/lib/epub-context";
import { THEME_STYLES } from "@/components/reader/epub-styles";
import { getEpubFontFamily } from "@/components/reader/epub-fonts";
import { parseEpubToc, type RawTocItem } from "@/components/reader/epub-toc";
import {
  calculateOverallProgress,
  readEpubScrollRatio,
  type EpubRelocatedLocation,
  type ReaderLocationChange,
} from "@/components/reader/epub-location";
import type { TocItem } from "@/types/reader";
import { cacheBookLocations, getCachedLocations } from "@/lib/book-cache";

interface UseEpubInitializerParams {
  bookId: string;
  bookData?: ArrayBuffer | null;
  bookUrl?: string | null;
  bookRef: MutableRefObject<Book | null>;
  currentLocationRef: MutableRefObject<string | null>;
  epubContextRef: MutableRefObject<EpubContext>;
  fontFamily?: string;
  fontSize: number;
  initialLocation?: string;
  justSelectedRef: MutableRefObject<boolean>;
  onClick?: () => void;
  onLocationChange?: (location: ReaderLocationChange) => void;
  onReady?: () => void;
  onTextSelected?: (cfiRange: string, text: string, position?: { x: number; y: number; bottom?: number }) => void;
  onTocLoaded?: (toc: TocItem[]) => void;
  progressRef: MutableRefObject<number>;
  renditionRef: MutableRefObject<Rendition | null>;
  setIsRenditionReady: (ready: boolean) => void;
  theme: "light" | "dark" | "sepia";
  viewerRef: RefObject<HTMLDivElement | null>;
  isInitialDisplayRef: MutableRefObject<boolean>;
}

function applyTransparentShell(viewer: HTMLDivElement | null) {
  if (!viewer) return;

  viewer.style.background = "transparent";

  // Apply styles to ALL epub-container elements (epubjs may create multiple)
  const epubContainers = viewer.querySelectorAll(".epub-container");
  epubContainers.forEach((container, index) => {
    const el = container as HTMLElement;
    el.style.background = "transparent";
    el.style.boxShadow = "none";
    el.style.overflowX = "hidden";
    
    // Only the last container (with actual content) should be scrollable
    // Other containers should not take up space
    if (index === epubContainers.length - 1) {
      el.style.overflowY = "auto";
      el.style.position = "relative";
      el.style.height = "100%";
    } else {
      el.style.overflowY = "hidden";
      el.style.position = "absolute";
      el.style.height = "0";
      el.style.visibility = "hidden";
    }
  });

  const iframeEl = viewer.querySelector("iframe") as HTMLIFrameElement | null;
  if (iframeEl) {
    iframeEl.style.background = "transparent";
    iframeEl.style.boxShadow = "none";
  }
}

function getSelectionMenuPosition(contentsWindow: Window) {
  const selection = contentsWindow.getSelection();
  const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
  const selectionRect = range?.getBoundingClientRect();
  const frameRect = (contentsWindow.frameElement as HTMLIFrameElement | null)?.getBoundingClientRect();

  if (!selectionRect || !frameRect) {
    return undefined;
  }

  return {
    x: frameRect.left + selectionRect.left + selectionRect.width / 2,
    y: frameRect.top + selectionRect.top,
    bottom: frameRect.top + selectionRect.bottom,
  };
}

function applyDocumentTheme(doc: Document, theme: "light" | "dark" | "sepia") {
  const themeStyle = THEME_STYLES[theme];
  doc.documentElement.style.background = themeStyle.html.background;
  doc.body.style.background = themeStyle.body.background;
  doc.body.style.color = themeStyle.body.color;
}

function parseInitialLocation(initialLocation?: string) {
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

  return { displayCfi, initialScrollRatio };
}

function injectSupSubImageStyle(doc: Document) {
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
    img, svg, video, canvas {
      max-width: 100% !important;
      width: auto !important;
      height: auto !important;
      object-fit: contain !important;
      box-sizing: border-box !important;
    }
  `;
  doc.head.appendChild(style);
}

function restoreInitialScroll(viewer: HTMLDivElement | null, ratio: number) {
  const containers = viewer?.querySelectorAll(".epub-container");
  if (!containers || containers.length === 0) return;
  const epubContainer = containers[containers.length - 1] as HTMLElement;

  const scrollRange = epubContainer.scrollHeight - epubContainer.clientHeight;
  if (scrollRange > 0) {
    epubContainer.scrollTop = Math.round(ratio * scrollRange);
  }
}

export function useEpubInitializer({
  bookId,
  bookData,
  bookUrl,
  bookRef,
  currentLocationRef,
  epubContextRef,
  fontFamily,
  fontSize,
  initialLocation,
  justSelectedRef,
  onClick,
  onLocationChange,
  onReady,
  onTextSelected,
  onTocLoaded,
  progressRef,
  renditionRef,
  setIsRenditionReady,
  theme,
  viewerRef,
  isInitialDisplayRef,
}: UseEpubInitializerParams) {
  const themeRef = useRef(theme);

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  // EPUB initialization registers event handlers once; callbacks captured via refs
  useEffect(() => {
    if (!viewerRef.current) return;
    if (!bookData && !bookUrl) return;

    let cancelled = false;
    let book: Book | null = null;

    async function init() {
      try {
        if (cancelled || !viewerRef.current) return;

        // Dynamic import: epubjs and its dependencies (JSZip, xmldom) are code-split
        const { default: ePub } = await import("epubjs");

        // Use bookData if available (cached), otherwise use bookUrl (proxy)
        const source = (bookData || bookUrl) as string | ArrayBuffer;
        book = ePub(source);
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
          allowScriptedContent: false,
        });
        renditionRef.current = rendition;
        epubContextRef.current.setRendition(rendition);
        epubContextRef.current.setContainer(viewerRef.current);
        applyTransparentShell(viewerRef.current);

        Object.entries(THEME_STYLES).forEach(([name, styles]) => {
          rendition.themes.register(name, styles);
        });

        rendition.themes.select(theme);
        rendition.themes.override("font-size", `${fontSize}px`);
        rendition.themes.override("font-family", getEpubFontFamily(fontFamily));

        const { displayCfi, initialScrollRatio } = parseInitialLocation(initialLocation);

        await book.ready;
        if (cancelled) return;

        rendition.display(displayCfi || undefined);

        rendition.once("displayed", () => {
          applyTransparentShell(viewerRef.current);
          setIsRenditionReady(true);

          const iframeEl = viewerRef.current?.querySelector("iframe") as HTMLIFrameElement | null;
          const doc = iframeEl?.contentDocument;
          if (doc) {
            applyDocumentTheme(doc, themeRef.current);
            injectSupSubImageStyle(doc);
          }

          if (initialScrollRatio !== null) {
            // Wait for the content to settle and layout correctly.
            // Scrolled-doc mode needs several attempts as images and fonts load,
            // which changes the scrollHeight dynamically.
            let attempts = 0;
            const maxAttempts = 10;
            
            const restore = () => {
              if (cancelled || !viewerRef.current || attempts >= maxAttempts) {
                isInitialDisplayRef.current = false;
                return;
              }
              
              const container = epubContextRef.current.getScrollContainer();
              if (container && container.scrollHeight > container.clientHeight) {
                restoreInitialScroll(viewerRef.current, initialScrollRatio);
                attempts++;
                
                // Continue checking for a short while as layout might still be shifting
                if (attempts < maxAttempts) {
                  setTimeout(restore, 200 * attempts);
                } else {
                  isInitialDisplayRef.current = false;
                }
              } else if (container) {
                attempts++;
                setTimeout(restore, 200);
              } else {
                isInitialDisplayRef.current = false;
              }
            };
            
            setTimeout(restore, 150);
          } else {
            isInitialDisplayRef.current = false;
          }

          // Step 1: Deferred Location Generation
          const generateLocations = async () => {
            if (cancelled || !bookRef.current) return;
            
            const cachedLocations = await getCachedLocations(bookId);
            if (cachedLocations && !cancelled) {
              try {
                const locationsJson = new TextDecoder().decode(cachedLocations);
                const locationsArray = JSON.parse(locationsJson);
                bookRef.current.locations.load(locationsArray);
                onReady?.();
                return;
              } catch (e) {
                logger.warn("epub-reader", "加载缓存 locations 失败", e);
              }
            }

            // If no cache, generate with a delay to ensure UI is interactive
            if (!cancelled) {
              bookRef.current.locations.generate(1024).then((locations) => {
                if (!cancelled) {
                  const locationsJson = JSON.stringify(locations);
                  const locationsBuffer = new TextEncoder().encode(locationsJson).buffer;
                  cacheBookLocations(bookId, locationsBuffer);
                }
                onReady?.();
              });
            }
          };

          if ("requestIdleCallback" in window) {
            window.requestIdleCallback(() => generateLocations(), { timeout: 2000 });
          } else {
            setTimeout(generateLocations, 1000);
          }
        });

        rendition.on("relocated", (location: EpubRelocatedLocation) => {
          const cfi = location.start.cfi;
          const href = location.start.href;
          const epubContainer = epubContextRef.current.getScrollContainer();
          const clampedProgress = calculateOverallProgress(bookRef.current, href, epubContainer);

          currentLocationRef.current = cfi;
          progressRef.current = clampedProgress;

          const scrollRatio = readEpubScrollRatio(epubContainer);

          // If this is the initial display and we have a scroll ratio to restore,
          // skip the first onLocationChange to avoid overwriting progress with 0
          if (isInitialDisplayRef.current && initialScrollRatio !== null) {
            logger.debug("epub-reader", "Skipping initial relocated event to preserve scroll restoration");
            return;
          }
          isInitialDisplayRef.current = false;

          onLocationChange?.({
            cfi,
            progress: clampedProgress,
            currentPage: location.start.displayed?.page,
            totalPages: location.start.displayed?.total,
            href,
            scrollRatio,
          });
        });

        rendition.on("selected", (cfiRange: string, contents: { window: Window }) => {
          if (!onTextSelected) return;

          const selectionText = contents.window.getSelection()?.toString().trim() || "";
          const menuPosition = getSelectionMenuPosition(contents.window);
          if (selectionText.length > 0) {
            onTextSelected(cfiRange, selectionText, menuPosition);
            return;
          }

          book!.getRange(cfiRange)
            .then((range: Range) => {
              const text = range.toString().trim();
              if (text.length > 0) {
                onTextSelected(cfiRange, text, menuPosition);
              }
            })
            .catch((error) => {
              logger.warn("epub-reader", "解析选中文本范围失败", error);
            });
        });

        rendition.on("click", () => {
          if (justSelectedRef.current) {
            justSelectedRef.current = false;
            return;
          }
          onClick?.();
        });

        book.loaded.navigation.then((nav) => {
          onTocLoaded?.(parseEpubToc(nav.toc as RawTocItem[]));
        });

        book.ready.then(async () => {
          // Locations generation moved to rendition.once("displayed") for performance
        });
      } catch (error) {
        logger.error("epub-reader", "加载EPUB失败", error);
      }
    }

    init();

    return () => {
      cancelled = true;
      setIsRenditionReady(false);
      renditionRef.current = null;
      bookRef.current = null;
      if (book) book.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookData, bookUrl, bookId, initialLocation]);
}
