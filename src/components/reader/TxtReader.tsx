"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

interface TxtReaderProps {
  url: string;
  initialPage?: number;
  fontSize?: number;
  theme?: "light" | "dark" | "sepia";
  onPageChange?: (page: number, totalPages: number) => void;
  activeTtsParagraph?: string;
  onRegisterController?: (controller: { nextPage: () => boolean }) => void;
  ttsImmersiveMode?: boolean;
}

const themeStyles: Record<string, { bg: string; text: string }> = {
  light: { bg: "bg-white", text: "text-black" },
  dark: { bg: "bg-[#1a1a2e]", text: "text-[#eee]" },
  sepia: { bg: "bg-[#f4ecd8]", text: "text-[#5b4636]" },
};

function TxtReader({
  url,
  initialPage = 1,
  fontSize = 16,
  theme = "light",
  onPageChange,
  activeTtsParagraph,
  onRegisterController,
  ttsImmersiveMode = false,
}: TxtReaderProps) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [pages, setPages] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load text content
  useEffect(() => {
    async function loadContent() {
      try {
        const res = await fetch(url);
        const text = await res.text();
        setContent(text);
      } catch {
        setContent("加载失败");
      } finally {
        setLoading(false);
      }
    }
    loadContent();
  }, [url]);

  // Paginate content
  const paginatedPages = useMemo(() => {
    if (!content) return [];

    // Approximate characters per page based on typical screen size
    const charsPerLine = Math.floor(40 * (16 / fontSize));
    const linesPerPage = Math.floor(35 * (16 / fontSize));
    const charsPerPage = charsPerLine * linesPerPage;

    const lines = content.split("\n");
    const result: string[] = [];
    let currentPageContent = "";
    let currentLineCount = 0;

    for (const line of lines) {
      const wrappedLines = Math.max(1, Math.ceil(line.length / charsPerLine));

      if (currentLineCount + wrappedLines > linesPerPage && currentPageContent) {
        result.push(currentPageContent);
        currentPageContent = "";
        currentLineCount = 0;
      }

      currentPageContent += line + "\n";
      currentLineCount += wrappedLines;
    }

    if (currentPageContent.trim()) {
      result.push(currentPageContent);
    }

    return result;
  }, [content, fontSize]);

  useEffect(() => {
    setPages(paginatedPages);
    if (paginatedPages.length > 0) {
      const page = Math.min(currentPage, paginatedPages.length);
      setCurrentPage(page);
      onPageChange?.(page, paginatedPages.length);
    }
  }, [paginatedPages]);

  const goToPage = useCallback(
    (page: number) => {
      if (page >= 1 && page <= pages.length) {
        setCurrentPage(page);
        onPageChange?.(page, pages.length);
      }
    },
    [pages.length, onPageChange]
  );

  useEffect(() => {
    onRegisterController?.({
      nextPage: () => {
        if (currentPage >= pages.length) {
          return false;
        }
        goToPage(currentPage + 1);
        return true;
      },
    });
  }, [currentPage, goToPage, onRegisterController, pages.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        goToPage(currentPage - 1);
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        goToPage(currentPage + 1);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [currentPage, goToPage]);

  const style = themeStyles[theme] || themeStyles.light;
  const pageText = pages[currentPage - 1] || "";
  const pageParagraphs = pageText
    .split(/\n\s*\n+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  const normalizeText = (value: string) => value.replace(/\s+/g, "").trim();
  const activeNeedle = normalizeText(activeTtsParagraph || "").slice(0, 80);

  useEffect(() => {
    if (!activeNeedle) return;

    const container = containerRef.current;
    if (!container) return;

    const activeElement = container.querySelector("[data-tts-active='1']") as
      | HTMLElement
      | null;
    if (!activeElement) return;

    activeElement.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });
  }, [activeNeedle, currentPage]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${style.bg}`}>
      <div
        ref={containerRef}
        className={`flex-1 overflow-auto px-8 py-6 max-w-3xl mx-auto w-full ${style.text}`}
        style={{
          fontSize: `${fontSize}px`,
          lineHeight: 1.8,
        }}
      >
        {pageParagraphs.length > 0 ? (
          <div data-reader-txt-page="true" className="space-y-4">
            {pageParagraphs.map((paragraph, index) => {
              const paragraphKey = `${index}-${paragraph.slice(0, 12)}`;
              const isActive =
                !!activeNeedle &&
                normalizeText(paragraph).includes(activeNeedle);

              if (ttsImmersiveMode && activeNeedle && !isActive) {
                return null;
              }

              return (
                <p
                  key={paragraphKey}
                  data-tts-active={isActive ? "1" : undefined}
                  className={`whitespace-pre-wrap leading-8 rounded-sm transition-colors ${
                    isActive
                      ? theme === "dark"
                        ? "bg-amber-300/25"
                        : "bg-amber-200/55"
                      : ""
                  }`}
                >
                  {paragraph}
                </p>
              );
            })}
          </div>
        ) : (
          <pre data-reader-txt-page="true" className="whitespace-pre-wrap font-[inherit] m-0">
            {pageText}
          </pre>
        )}
      </div>

      {/* Navigation */}
      {pages.length > 1 && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-background/95 backdrop-blur border rounded-full px-4 py-2 shadow-lg">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground min-w-[5rem] text-center">
            {currentPage} / {pages.length}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= pages.length}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default TxtReader;
