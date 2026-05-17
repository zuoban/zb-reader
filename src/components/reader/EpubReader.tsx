"use client";

import {
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useState,
} from "react";
import type { Book, Rendition } from "epubjs";
import { logger } from "@/lib/logger";
import type { ReaderParagraph, TocItem } from "@/types/reader";
import { EpubContext } from "@/lib/epub-context";
import { useEpubAppearance } from "./hooks/useEpubAppearance";
import { useEpubDisplayedLifecycle } from "./hooks/useEpubDisplayedLifecycle";
import { useEpubHighlights } from "./hooks/useEpubHighlights";
import { useEpubInitializer } from "./hooks/useEpubInitializer";
import { useEpubKeyboardScroll } from "./hooks/useEpubKeyboardScroll";
import { useEpubParagraphs } from "./hooks/useEpubParagraphs";
import { useEpubResponsiveWidth } from "./hooks/useEpubResponsiveWidth";
import { useEpubScrollProgress } from "./hooks/useEpubScrollProgress";
import { useEpubTtsHighlighting } from "./hooks/useEpubTtsHighlighting";
import { useEpubSwipeGesture } from "./hooks/useEpubSwipeGesture";

interface EpubReaderProps {
  bookId: string;
  bookData?: ArrayBuffer | null;
  bookUrl?: string | null;
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
  onTextSelected?: (cfiRange: string, text: string, position?: { x: number; y: number; bottom?: number }) => void;
  onClick?: () => void;
  highlights?: Array<{ cfiRange: string; color: string; id: string }>;
  activeTtsParagraph?: string;
  activeTtsParagraphId?: string | null;
  activeTtsSentenceIndexInParagraph?: number;
  activeTtsLocation?: string | null;
  ttsHighlightColor?: string;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onPrevChapter?: () => void;
  onNextChapter?: () => void;
  hasPrevChapter?: boolean;
  hasNextChapter?: boolean;
  swipeEnabled?: boolean;
}

export type { ReaderParagraph };

export interface EpubReaderRef {
  goToLocation: (cfi: string) => Promise<void>;
  goToHref: (href: string) => Promise<void>;
  nextPage: () => Promise<void>;
  prevPage: () => Promise<void>;
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

const EpubReader = forwardRef<EpubReaderRef, EpubReaderProps>(
  (
    {
      bookId,
      bookData,
      bookUrl,
      initialLocation,
      fontSize = 16,
      fontFamily = "system",
      theme = "light",
      onLocationChange,
      onTocLoaded,
      onTextSelected,
      onClick,
      highlights,
      activeTtsParagraph,
      activeTtsParagraphId,
      activeTtsSentenceIndexInParagraph = 0,
      activeTtsLocation,
      ttsHighlightColor = "#3b82f6",
      onSwipeLeft,
      onSwipeRight,
      onPrevChapter,
      onNextChapter,
      hasPrevChapter = false,
      hasNextChapter = false,
      swipeEnabled = true,
    },
    ref
  ) => {
    const contentWidth = useEpubResponsiveWidth();

    const viewerRef = useRef<HTMLDivElement>(null);
    const bookRef = useRef<Book | null>(null);
    const renditionRef = useRef<Rendition | null>(null);
    const currentLocationRef = useRef<string | null>(null);
    const progressRef = useRef<number>(0);
    const [isRenditionReady, setIsRenditionReady] = useState(false);
    const justSelectedRef = useRef(false);
    const isInitialDisplayRef = useRef(true);

    const epubContextRef = useRef<EpubContext>(new EpubContext());

    const {
      buildParagraphLayoutIndex,
      getCurrentParagraphs,
      isFirstVisibleParagraphComplete,
      lastLayoutCfiRef,
      paragraphLayoutsRef,
      positionIndexRef,
    } = useEpubParagraphs({
      currentLocationRef,
      epubContextRef,
      fontSize,
    });

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
      async goToLocation(cfi: string) {
        const range = await resolveRangeSafely(cfi);
        if (!range) return;
        await renditionRef.current?.display(stripScrollSuffix(cfi));
      },
      async goToHref(href: string) {
        await renditionRef.current?.display(href);
      },
      async nextPage() {
        const rendition = renditionRef.current;
        if (!rendition) return;
        await rendition.next();
        epubContextRef.current.getScrollContainer()?.scrollTo(0, 0);
      },
      async prevPage() {
        const rendition = renditionRef.current;
        if (!rendition) return;
        await rendition.prev();
        epubContextRef.current.getScrollContainer()?.scrollTo(0, 0);
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
      getCurrentParagraphs,
      isFirstVisibleParagraphComplete,
      scrollToActiveParagraph() {
        const ctx = epubContextRef.current;
        const activeElement = ctx.getActiveTtsElement();
        if (!activeElement) return;

        ctx.scrollToTop(activeElement);
      },
    }));

    useEpubTtsHighlighting({
      activeTtsLocation,
      activeTtsParagraph,
      activeTtsParagraphId,
      activeTtsSentenceIndexInParagraph,
      epubContextRef,
      paragraphLayoutsRef,
      positionIndexRef,
      resolveRangeSafely,
      theme,
      ttsHighlightColor,
    });

    useEpubInitializer({
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
      onTextSelected,
      onTocLoaded,
      progressRef,
      renditionRef,
      setIsRenditionReady,
      theme,
      viewerRef,
      isInitialDisplayRef,
    });

    useEpubAppearance({
      buildParagraphLayoutIndex,
      epubContextRef,
      fontFamily,
      fontSize,
      isRenditionReady,
      pageWidth: contentWidth,
      renditionRef,
      theme,
    });

    const { applyHighlights } = useEpubHighlights({
      highlights,
      isRenditionReady,
      renditionRef,
      resolveRangeSafely,
    });

    useEpubDisplayedLifecycle({
      applyHighlights,
      buildParagraphLayoutIndex,
      currentLocationRef,
      epubContextRef,
      isRenditionReady,
      lastLayoutCfiRef,
      pageWidth: contentWidth,
      renditionRef,
    });

    useEpubKeyboardScroll({
      epubContextRef,
      isRenditionReady,
      renditionRef,
      onPrevChapter,
      onNextChapter,
    });

    useEpubScrollProgress({
      currentLocationRef,
      isRenditionReady,
      onLocationChange,
      progressRef,
      epubContextRef,
      isInitialDisplayRef,
    });

    useEpubSwipeGesture({
      isRenditionReady,
      renditionRef,
      onSwipeLeft: onSwipeLeft ?? (() => {}),
      onSwipeRight: onSwipeRight ?? (() => {}),
      hasPrevChapter,
      hasNextChapter,
      enabled: swipeEnabled,
    });

    return (
      <div className="relative h-full w-full">
        <div
          ref={viewerRef}
          id="epub-viewer"
          className="h-full w-full overflow-x-hidden"
        />
      </div>
    );
  }
);

EpubReader.displayName = "EpubReader";

export default EpubReader;
