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
  bookFormat: string;
  bookId: string;
  bookTitle: string;
  bookUrl: string;
  epubReaderRef: React.RefObject<EpubReaderRef | null>;
  fontFamily: FontFamily;
  fontSize: number;
  highlights: Array<{ cfiRange: string; color: string; id: string }>;
  initialLocation?: string;
  isSpeaking: boolean;
  isTtsViewOpen: boolean;
  progress: number;
  readerTheme: "light" | "dark" | "sepia";
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
  bookFormat,
  bookId,
  bookTitle,
  bookUrl,
  epubReaderRef,
  fontFamily,
  fontSize,
  highlights,
  initialLocation,
  isSpeaking,
  isTtsViewOpen,
  progress,
  readerTheme,
  ttsHighlightColor,
  onClick,
  onLocationChange,
  onTextSelected,
  onTocLoaded,
}: ReaderCanvasProps) {
  return (
    <div className="relative h-full w-full">
      <div className="h-full w-full px-1.5 py-4 sm:px-6">
        <div className="relative mx-auto h-full">
          {!isSpeaking && !isTtsViewOpen ? (
            <div className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2">
              <div
                className="reader-liquid-control pointer-events-auto inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs"
                style={{ color: "var(--reader-muted-text)" }}
              >
                <span className="max-w-[120px] truncate">{bookTitle}</span>
                <span className="text-[10px]">{(progress * 100).toFixed(0)}%</span>
              </div>
            </div>
          ) : null}

          <div
            className="h-full w-full"
            style={{
              paddingTop: isTtsViewOpen ? 0 : 40,
              paddingBottom: isTtsViewOpen ? 0 : 24,
            }}
          >
            {bookFormat === "epub" && (
              <EpubReader
                key={bookId}
                ref={epubReaderRef}
                url={bookUrl}
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
    </div>
  );
}
