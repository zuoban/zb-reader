"use client";

import dynamic from "next/dynamic";
import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const EpubReader = dynamic(() => import("@/components/reader/EpubReader"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  ),
});

import { useBookData, useTts, useReaderUI, useNavigation, useReaderSettings } from "./providers";
import { useReaderContext } from "./ReaderContext";
import { useReaderSettingsStore } from "@/stores/reader-settings";

function ReaderCanvasInner() {
  const { book, bookData, bookUrl, highlights, initialLocation } = useBookData();
  const { 
    isSpeaking, 
    isTtsViewOpen, 
    activeTtsLocation, 
    activeTtsParagraph, 
    activeTtsParagraphId, 
    activeTtsSentenceIndexInParagraph 
  } = useTts();
  const { toolbarVisible, currentChapterTitle } = useReaderUI();
  const { 
    progress, 
    currentPage, 
    totalPages, 
    handleLocationChange, 
    handleTextSelected, 
    handleTocLoaded,
    handleToggleToolbar
  } = useNavigation();
  const { readerTheme } = useReaderSettings();
  const { epubReaderRef } = useReaderContext();
  
  const fontSize = useReaderSettingsStore((s) => s.fontSize);
  const fontFamily = useReaderSettingsStore((s) => s.fontFamily);
  const ttsHighlightColor = useReaderSettingsStore((s) => s.ttsHighlightColor);

  if (!book) return null;

  return (
    <div className="relative h-full w-full flex flex-col overflow-hidden bg-[var(--reader-bg)]">
      <div className="relative flex-1 min-h-0 w-full">
        {book.format === "epub" && (bookData || bookUrl) && (
          <EpubReader
            key={book.id}
            ref={epubReaderRef}
            bookId={book.id}
            bookData={bookData}
            bookUrl={bookUrl}
            initialLocation={initialLocation}
            fontSize={fontSize}
            fontFamily={fontFamily}
            theme={readerTheme as "light" | "dark" | "sepia"}
            onLocationChange={handleLocationChange}
            onTocLoaded={handleTocLoaded}
            onTextSelected={handleTextSelected}
            onClick={isSpeaking ? undefined : handleToggleToolbar}
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
              {currentChapterTitle || book.title}
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

export const ReaderCanvas = React.memo(ReaderCanvasInner);
