"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
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

export function ReaderCanvas({
  activeTtsLocation,
  activeTtsParagraph,
  activeTtsParagraphId,
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
    <div className="relative h-full w-full">
      <div className="relative h-full w-full">
        {/* Minimalist Footer */}
        {!isTtsViewOpen && (
          <div className="pointer-events-none fixed inset-x-0 bottom-3 z-10 flex items-center justify-between px-8 text-[9px] font-bold tracking-[0.2em] uppercase transition-opacity duration-500" style={{ color: "var(--reader-text)", opacity: 0.25 }}>
            <span className="tabular-nums">
              {(progress * 100).toFixed(0)}%
            </span>
            <span className="mx-4 truncate font-heading italic normal-case tracking-normal opacity-80">
              {currentChapterTitle || bookTitle}
            </span>
            <span className="tabular-nums">
              {currentPage != null && totalPages != null
                ? `${currentPage} / ${totalPages}`
                : ""}
            </span>
          </div>
        )}

        <div className="h-full w-full">
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
              activeTtsLocation={activeTtsLocation}
              ttsHighlightColor={ttsHighlightColor}
            />
          )}
        </div>
      </div>
    </div>
  );
}
