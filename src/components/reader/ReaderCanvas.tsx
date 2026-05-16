"use client";

import dynamic from "next/dynamic";
import React, { useEffect } from "react";
import { Loader2 } from "lucide-react";

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
import { ReaderToolbar } from "@/components/reader/ReaderToolbar";
import { useReaderSettingsStore } from "@/stores/reader-settings";
import { cn } from "@/lib/utils";

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
  const { currentChapterTitle, toolbarVisible } = useReaderUI();
  const {
    progress,
    currentPage,
    totalPages,
    handleLocationChange,
    handleTextSelected,
    handleTocLoaded,
    handleToggleToolbar,
    handlePrevChapter,
    handleNextChapter,
    hasPrevChapter,
    hasNextChapter,
  } = useNavigation();
  const { readerTheme } = useReaderSettings();
  const { epubReaderRef } = useReaderContext();
  
  const fontSize = useReaderSettingsStore((s) => s.fontSize);
  const fontFamily = useReaderSettingsStore((s) => s.fontFamily);
  const ttsHighlightColor = useReaderSettingsStore((s) => s.ttsHighlightColor);

  if (!book) return null;

  const showToolbar = toolbarVisible && !isSpeaking && !isTtsViewOpen;

  return (
    <div className="relative h-full w-full flex flex-col gap-0 overflow-hidden bg-[var(--reader-bg)] border-none shadow-none">
      {/* Top Toolbar Area - Part of the flow with fixed height to prevent layout shift */}
      <div 
        className={cn(
          "shrink-0 transition-opacity duration-300 ease-in-out h-11",
          showToolbar ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <ReaderToolbar />
      </div>

      <div className="relative flex-1 min-h-0 w-full border-none shadow-none">
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
            onSwipeLeft={handleNextChapter}
            onSwipeRight={handlePrevChapter}
            onPrevChapter={handlePrevChapter}
            onNextChapter={handleNextChapter}
            hasPrevChapter={hasPrevChapter}
            hasNextChapter={hasNextChapter}
            swipeEnabled={!isSpeaking}
            highlights={highlights}
            activeTtsParagraph={activeTtsParagraph}
            activeTtsParagraphId={activeTtsParagraphId}
            activeTtsSentenceIndexInParagraph={activeTtsSentenceIndexInParagraph}
            activeTtsLocation={activeTtsLocation}
            ttsHighlightColor={ttsHighlightColor}
          />
        )}
      </div>

      {/* Minimalist Footer Area */}
      {!isTtsViewOpen && (
        <div className="relative shrink-0 bg-[var(--reader-bg)] !border-0 !shadow-none outline-none">
          <div
            role="button"
            tabIndex={0}
            aria-label="显示或隐藏顶部菜单栏"
            onClick={handleToggleToolbar}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                handleToggleToolbar();
              }
            }}
            className="relative z-20 grid h-7 cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-6 text-[10px] font-medium tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--reader-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--reader-bg)] sm:px-10 !border-0 !shadow-none outline-none"
            style={{ color: "var(--reader-text)" }}
          >
            {/* Left: Progress */}
            <div className="flex min-w-[2.5rem] shrink-0 items-center opacity-60">
              <span className="tabular-nums">
                {(progress * 100).toFixed(0)}%
              </span>
            </div>

            {/* Center: Title */}
            <div className="min-w-0 text-center opacity-50">
              <span
                className="block truncate font-heading"
                title={currentChapterTitle || book.title}
              >
                {currentChapterTitle || book.title}
              </span>
            </div>

            {/* Right: Page Count */}
            <div className="flex min-w-[2.5rem] shrink-0 items-center justify-end gap-1 tabular-nums opacity-60">
              {currentPage != null && totalPages != null && (
                <>
                  <span>{currentPage}</span>
                  <span className="opacity-40">/</span>
                  <span>{totalPages}</span>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const ReaderCanvas = React.memo(ReaderCanvasInner);
