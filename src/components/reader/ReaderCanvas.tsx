"use client";

import dynamic from "next/dynamic";
import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EpubReaderRef } from "@/components/reader/EpubReader";
import type { FontFamily } from "@/stores/reader-settings";
import type { TocItem } from "@/types/reader";

const EpubReader = dynamic(() => import("@/components/reader/EpubReader"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  ),
});

interface ReaderCanvasProps {
  activeTtsLocation: string | null;
  activeTtsParagraph: string;
  activeTtsParagraphId: string | null;
  activeTtsSentenceIndexInParagraph: number;
  bookData: ArrayBuffer | null;
  bookUrl: string | null;
  bookFormat: string;
  bookId: string;
  bookTitle: string;
  currentChapterTitle?: string;
  currentPage?: number;
  epubReaderRef: React.RefObject<EpubReaderRef | null>;
  fontFamily: FontFamily;
  fontSize: number;
  highlights: Array<{ cfiRange: string; color: string; id: string }>;
  initialLocation?: string;
  isSpeaking: boolean;
  isTtsViewOpen: boolean;
  toolbarVisible?: boolean;
  progress: number;
  readerTheme: "light" | "dark" | "sepia";
  totalPages?: number;
  ttsHighlightColor: string;
  onClick?: () => void;
  onLocationChange: (location: {
    cfi: string;
    progress: number;
    currentPage?: number;
    totalPages?: number;
    href?: string;
    scrollRatio?: number;
  }) => void;
  onTextSelected: (cfiRange: string, text: string) => void;
  onTocLoaded: (tocItems: TocItem[]) => void;
}

function ReaderCanvasInner({
  activeTtsLocation,
  activeTtsParagraph,
  activeTtsParagraphId,
  activeTtsSentenceIndexInParagraph,
  bookData,
  bookUrl,
  bookFormat,
  bookId,
  bookTitle,
  currentChapterTitle,
  currentPage,
  epubReaderRef,
  fontFamily,
  fontSize,
  highlights,
  initialLocation,
  isSpeaking,
  isTtsViewOpen,
  toolbarVisible = false,
  progress,
  readerTheme,
  totalPages,
  ttsHighlightColor,
  onClick,
  onLocationChange,
  onTextSelected,
  onTocLoaded,
}: ReaderCanvasProps) {
  return (
    <div className="relative h-full w-full flex flex-col overflow-hidden bg-[var(--reader-bg)]">
      <div className="relative flex-1 min-h-0 w-full">
        {bookFormat === "epub" && (bookData || bookUrl) && (
          <EpubReader
            key={bookId}
            ref={epubReaderRef}
            bookId={bookId}
            bookData={bookData}
            bookUrl={bookUrl}
            initialLocation={initialLocation}
            fontSize={fontSize}
            fontFamily={fontFamily}
            theme={readerTheme}
            onLocationChange={onLocationChange}
            onTocLoaded={onTocLoaded}
            onTextSelected={onTextSelected}
            onClick={isSpeaking ? undefined : onClick}
            highlights={highlights}
            activeTtsParagraph={activeTtsParagraph}
            activeTtsParagraphId={activeTtsParagraphId}
            activeTtsSentenceIndexInParagraph={activeTtsSentenceIndexInParagraph}
            activeTtsLocation={activeTtsLocation}
            ttsHighlightColor={ttsHighlightColor}
          />
        )}
      </div>

      {/* Minimalist Footer Area - Dedicated Space */}
      {!isTtsViewOpen && (
        <div
          className={cn(
            "reader-status-footer relative flex shrink-0 items-center justify-between overflow-hidden px-5 text-[11px] font-semibold transition-all duration-500 ease-in-out sm:px-8",
            toolbarVisible ? "h-0 opacity-0 pointer-events-none border-t-transparent" : "h-12 opacity-100"
          )}
        >
          {/* Left: Progress */}
          <div className="flex min-w-[3rem] shrink-0 items-center">
            <span className="reader-status-meta tabular-nums">
              {(progress * 100).toFixed(0)}%
            </span>
          </div>

          {/* Center: Title (Absolute Centered) */}
          <div className="absolute left-1/2 top-1/2 w-full max-w-[58vw] -translate-x-1/2 -translate-y-1/2 text-center sm:max-w-xl">
            <span className="reader-status-title block truncate font-heading text-[12px] font-semibold tracking-normal">
              {currentChapterTitle || bookTitle}
            </span>
          </div>

          {/* Right: Page Count */}
          <div className="reader-status-meta flex min-w-[3rem] shrink-0 items-center justify-end gap-1.5 tabular-nums">
            {currentPage != null && totalPages != null && (
              <>
                <span>{currentPage}</span>
                <span className="reader-status-divider">/</span>
                <span>{totalPages}</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export const ReaderCanvas = React.memo(ReaderCanvasInner, (prev, next) => {
  return (
    prev.activeTtsLocation === next.activeTtsLocation &&
    prev.activeTtsParagraph === next.activeTtsParagraph &&
    prev.activeTtsParagraphId === next.activeTtsParagraphId &&
    prev.activeTtsSentenceIndexInParagraph === next.activeTtsSentenceIndexInParagraph &&
    prev.bookData === next.bookData &&
    prev.bookUrl === next.bookUrl &&
    prev.bookFormat === next.bookFormat &&
    prev.bookId === next.bookId &&
    prev.bookTitle === next.bookTitle &&
    prev.currentChapterTitle === next.currentChapterTitle &&
    prev.currentPage === next.currentPage &&
    prev.epubReaderRef === next.epubReaderRef &&
    prev.fontFamily === next.fontFamily &&
    prev.fontSize === next.fontSize &&
    prev.highlights === next.highlights &&
    prev.initialLocation === next.initialLocation &&
    prev.isSpeaking === next.isSpeaking &&
    prev.isTtsViewOpen === next.isTtsViewOpen &&
    prev.onClick === next.onClick &&
    prev.onLocationChange === next.onLocationChange &&
    prev.onTextSelected === next.onTextSelected &&
    prev.onTocLoaded === next.onTocLoaded &&
    prev.toolbarVisible === next.toolbarVisible &&
    prev.progress === next.progress &&
    prev.readerTheme === next.readerTheme &&
    prev.totalPages === next.totalPages &&
    prev.ttsHighlightColor === next.ttsHighlightColor
  );
});
