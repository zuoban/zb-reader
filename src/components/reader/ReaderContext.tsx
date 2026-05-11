"use client";

import React, { createContext, useContext, useMemo, useState, useRef } from "react";
import type { EpubReaderRef } from "@/components/reader/EpubReader";

interface ReaderContextValue {
  // Common refs
  epubReaderRef: React.RefObject<EpubReaderRef | null>;
  currentLocationRef: React.RefObject<string | null>;
  currentCfiRef: React.RefObject<string | null>;
  progressRef: React.RefObject<number>;
  handleBackRef: React.RefObject<(() => Promise<void>) | null>;
  
  // UI State
  toolbarVisible: boolean;
  setToolbarVisible: React.Dispatch<React.SetStateAction<boolean>>;
  progress: number;
  setProgress: React.Dispatch<React.SetStateAction<number>>;
  currentPage?: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number | undefined>>;
  totalPages?: number;
  setTotalPages: React.Dispatch<React.SetStateAction<number | undefined>>;
  
  // Bookmark state
  isCurrentBookmarked: boolean;
  setIsCurrentBookmarked: React.Dispatch<React.SetStateAction<boolean>>;
}

const ReaderContext = createContext<ReaderContextValue | null>(null);

export function ReaderProvider({ children }: { children: React.ReactNode }) {
  const epubReaderRef = useRef<EpubReaderRef>(null);
  const currentLocationRef = useRef<string | null>(null);
  const currentCfiRef = useRef<string | null>(null);
  const progressRef = useRef<number>(0);
  const handleBackRef = useRef<(() => Promise<void>) | null>(null);

  const [toolbarVisible, setToolbarVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentPage, setCurrentPage] = useState<number | undefined>();
  const [totalPages, setTotalPages] = useState<number | undefined>();
  const [isCurrentBookmarked, setIsCurrentBookmarked] = useState(false);

  const value = useMemo(() => ({
    epubReaderRef,
    currentLocationRef,
    currentCfiRef,
    progressRef,
    handleBackRef,
    toolbarVisible,
    setToolbarVisible,
    progress,
    setProgress,
    currentPage,
    setCurrentPage,
    totalPages,
    setTotalPages,
    isCurrentBookmarked,
    setIsCurrentBookmarked,
  }), [toolbarVisible, progress, currentPage, totalPages, isCurrentBookmarked]);

  return (
    <ReaderContext.Provider value={value}>
      {children}
    </ReaderContext.Provider>
  );
}

export function useReaderContext() {
  const context = useContext(ReaderContext);
  if (!context) {
    throw new Error("useReaderContext must be used within a ReaderProvider");
  }
  return context;
}
