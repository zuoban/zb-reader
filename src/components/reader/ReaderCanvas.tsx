"use client";

import dynamic from "next/dynamic";
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
            activeTtsLocation={activeTtsLocation}
            ttsHighlightColor={ttsHighlightColor}
          />
        )}
      </div>

      {/* Minimalist Footer Area - Dedicated Space */}
      {!isTtsViewOpen && (
        <div 
          className={cn(
            "relative shrink-0 flex items-center justify-between px-6 sm:px-8 text-[10px] font-bold tracking-[0.15em] uppercase transition-all duration-500 ease-in-out border-t border-[var(--reader-text)]/10 overflow-hidden",
            toolbarVisible ? "h-0 opacity-0 pointer-events-none border-t-transparent" : "h-11 opacity-60"
          )}
          style={{ 
            color: "var(--reader-text)",
            background: "var(--reader-bg)"
          }}
        >
          {/* Left: Progress */}
          <div className="flex items-center shrink-0 min-w-[3rem]">
            <span className="tabular-nums">
              {(progress * 100).toFixed(0)}%
            </span>
          </div>

          {/* Center: Title (Absolute Centered) */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[45vw] sm:max-w-md text-center">
            <span className="truncate block font-heading italic normal-case tracking-normal text-[11px]">
              {currentChapterTitle || bookTitle}
            </span>
          </div>

          {/* Right: Page Count */}
          <div className="flex items-center justify-end gap-1.5 tabular-nums shrink-0 min-w-[3rem]">
            {currentPage != null && totalPages != null && (
              <>
                <span className="opacity-90">{currentPage}</span>
                <span className="opacity-20">/</span>
                <span className="opacity-40">{totalPages}</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
