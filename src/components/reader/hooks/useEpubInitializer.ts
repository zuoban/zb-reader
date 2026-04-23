"use client";

import { useEffect, useRef } from "react";
import type { MutableRefObject, RefObject } from "react";
import ePub, { Book, Rendition } from "epubjs";
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

interface UseEpubInitializerParams {
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
  onTextSelected?: (cfiRange: string, text: string) => void;
  onTocLoaded?: (toc: TocItem[]) => void;
  progressRef: MutableRefObject<number>;
  renditionRef: MutableRefObject<Rendition | null>;
  scrollRatioRef: MutableRefObject<number>;
  setIsReady: (ready: boolean) => void;
  setIsRenditionReady: (ready: boolean) => void;
  theme: "light" | "dark" | "sepia";
  url: string;
  viewerRef: RefObject<HTMLDivElement | null>;
}

function applyTransparentShell(viewer: HTMLDivElement | null) {
  if (!viewer) return;

  viewer.style.background = "transparent";

  const epubContainer = viewer.querySelector(".epub-container") as HTMLElement | null;
  if (epubContainer) {
    epubContainer.style.background = "transparent";
    epubContainer.style.boxShadow = "none";
  }

  const iframeEl = viewer.querySelector("iframe") as HTMLIFrameElement | null;
  if (iframeEl) {
    iframeEl.style.background = "transparent";
    iframeEl.style.boxShadow = "none";
  }
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
  `;
  doc.head.appendChild(style);
}

function restoreInitialScroll(viewer: HTMLDivElement | null, ratio: number) {
  const epubContainer = viewer?.querySelector(".epub-container") as HTMLElement | null;
  if (!epubContainer) return;

  const scrollRange = epubContainer.scrollHeight - epubContainer.clientHeight;
  if (scrollRange > 0) {
    epubContainer.scrollTop = Math.round(ratio * scrollRange);
  }
}

export function useEpubInitializer({
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
  scrollRatioRef,
  setIsReady,
  setIsRenditionReady,
  theme,
  url,
  viewerRef,
}: UseEpubInitializerParams) {
  const themeRef = useRef(theme);

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

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
            setTimeout(() => {
              restoreInitialScroll(viewerRef.current, initialScrollRatio);
            }, 120);
          }
        });

        rendition.on("relocated", (location: EpubRelocatedLocation) => {
          const cfi = location.start.cfi;
          const href = location.start.href;
          const epubContainer = viewerRef.current?.querySelector(
            ".epub-container"
          ) as HTMLElement | null;
          const clampedProgress = calculateOverallProgress(bookRef.current, href, epubContainer);

          currentLocationRef.current = cfi;
          progressRef.current = clampedProgress;

          const scrollRatio = readEpubScrollRatio(epubContainer);
          if (typeof scrollRatio === "number") {
            scrollRatioRef.current = scrollRatio;
          }

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
      renditionRef.current = null;
      bookRef.current = null;
      if (book) book.destroy();
    };
  }, [url, initialLocation]);
}
