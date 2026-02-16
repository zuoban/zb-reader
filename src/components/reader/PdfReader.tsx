"use client";

import { useState, useEffect, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

// Set worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfReaderProps {
  url: string;
  initialPage?: number;
  onPageChange?: (page: number, totalPages: number) => void;
}

function PdfReader({ url, initialPage, onPageChange }: PdfReaderProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(initialPage || 1);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const updateWidth = () => {
      setContainerWidth(Math.min(window.innerWidth - 40, 800));
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  const onDocumentLoadSuccess = useCallback(
    ({ numPages }: { numPages: number }) => {
      setNumPages(numPages);
      setLoading(false);
      const page = initialPage || 1;
      setPageNumber(page);
      onPageChange?.(page, numPages);
    },
    [initialPage, onPageChange]
  );

  const goToPage = useCallback(
    (page: number) => {
      if (page >= 1 && page <= numPages) {
        setPageNumber(page);
        onPageChange?.(page, numPages);
      }
    },
    [numPages, onPageChange]
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        goToPage(pageNumber - 1);
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        goToPage(pageNumber + 1);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [pageNumber, goToPage]);

  return (
    <div className="flex flex-col items-center h-full overflow-auto">
      {loading && (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      <div className="flex-1 flex items-start justify-center pt-4 pb-20">
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={null}
        >
          <Page
            pageNumber={pageNumber}
            width={containerWidth}
            renderTextLayer={true}
            renderAnnotationLayer={true}
          />
        </Document>
      </div>

      {/* Navigation buttons */}
      {numPages > 0 && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-background/95 backdrop-blur border rounded-full px-4 py-2 shadow-lg">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => goToPage(pageNumber - 1)}
            disabled={pageNumber <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground min-w-[5rem] text-center">
            {pageNumber} / {numPages}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => goToPage(pageNumber + 1)}
            disabled={pageNumber >= numPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default PdfReader;
