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

export type { ReaderParagraph };

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
    const [_isReady, setIsReady] = useState(false);
    const [isRenditionReady, setIsRenditionReady] = useState(false);
    const justSelectedRef = useRef(false);

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
      epubContextRef,
      paragraphLayoutsRef,
      positionIndexRef,
      resolveRangeSafely,
      theme,
      ttsHighlightColor,
    });

    useEpubInitializer({
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
    });

    useEpubAppearance({
      buildParagraphLayoutIndex,
      epubContextRef,
      fontFamily,
      fontSize,
      isRenditionReady,
      pageWidth,
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
      lastLayoutCfiRef,
      pageWidth,
      renditionRef,
    });

    useEpubKeyboardScroll({
      epubContextRef,
      isRenditionReady,
      renditionRef,
    });

    useEpubScrollProgress({
      currentLocationRef,
      isRenditionReady,
      onLocationChange,
      progressRef,
      scrollRatioRef,
      viewerRef,
    });

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
