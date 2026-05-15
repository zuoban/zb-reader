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

      {/* Minimalist Footer Area */}
      {!isTtsViewOpen && (
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
          className="reader-status-footer absolute inset-x-0 bottom-0 z-20 grid h-11 cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 overflow-hidden border-t border-[color-mix(in_srgb,var(--reader-text)_14%,transparent)] bg-[var(--reader-bg)] px-6 text-xs font-bold tracking-tight shadow-[0_-12px_32px_-28px_color-mix(in_srgb,var(--reader-text)_55%,transparent)] transition-colors duration-200 hover:bg-[color-mix(in_srgb,var(--reader-text)_3%,var(--reader-bg))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--reader-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--reader-bg)] sm:px-10"
          style={{ color: "var(--reader-text)" }}
        >
          {/* Left: Progress */}
          <div className="flex min-w-[3rem] shrink-0 items-center">
            <span className="reader-status-meta tabular-nums">
              {(progress * 100).toFixed(0)}%
            </span>
          </div>

          {/* Center: Title */}
          <div className="min-w-0 text-center">
            <span
              className="reader-status-title block truncate font-heading text-xs font-bold tracking-tight"
              title={currentChapterTitle || book.title}
            >
              {currentChapterTitle || book.title}
            </span>
          </div>

          {/* Right: Page Count */}
          <div className="reader-status-meta flex min-w-[3rem] shrink-0 items-center justify-end gap-1 tabular-nums">
            {currentPage != null && totalPages != null && (
              <>
                <span>{currentPage}</span>
                <span className="mx-0.5 opacity-60">/</span>
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
