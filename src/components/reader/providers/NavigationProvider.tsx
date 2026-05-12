"use client";

import React, { createContext, useContext, useEffect } from "react";
import { useParams } from "next/navigation";
import { useReaderNavigation } from "@/components/reader/hooks/useReaderNavigation";
import { useReaderContext } from "@/components/reader/ReaderContext";
import { useProgressSyncCompat } from "@/hooks/useProgressSyncCompat";
import { useBookData } from "./BookDataProvider";
import { useTts } from "./TtsProvider";
import { useReaderUI } from "./ReaderUIProvider";
import { useAnnotation } from "./AnnotationProvider";

interface NavigationContextValue {
  handleLocationChange: (location: any) => void;
  handleTocLoaded: (tocItems: any[]) => void;
  handleTextSelected: (cfiRange: string, text: string) => void;
  handleToggleToolbar: () => void;
  handleBack: () => Promise<void>;
  handleTocItemClick: (href: string) => void;
  handleBookmarkClick: (location: string) => void;
  handleNoteClick: (location: string) => void;
  handleProgressChange: (newProgress: number) => void;
  handlePrevPage: () => void;
  handleNextPage: () => void;
  handlePrevChapter: () => void;
  handleNextChapter: () => void;
  hasPrevChapter: boolean;
  hasNextChapter: boolean;
  toc: any[];
  currentHref: string | undefined;
  progress: number;
  currentPage: number | undefined;
  totalPages: number | undefined;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const bookId = params.bookId as string;
  const { book, initialProgress, bookmarks } = useBookData();
  const { isSpeaking } = useTts();
  const { setToolbarVisible, setSidePanelOpen, setToc, setCurrentHref, toc, currentHref } = useReaderUI();
  const { setSelectionMenu, setSelectionMenuKey, setIsCurrentBookmarked } = useAnnotation();

  const {
    epubReaderRef,
    currentLocationRef,
    currentCfiRef,
    progressRef,
    progress,
    setProgress,
    currentPage,
    setCurrentPage,
    totalPages,
    setTotalPages,
    handleBackRef,
  } = useReaderContext();

  // Progress sync
  const progressSync = useProgressSyncCompat(bookId, initialProgress, {
    currentLocationRef,
    progressRef,
  });
  const { saveProgress, debouncedSaveProgress } = progressSync;

  const navigation = useReaderNavigation({
    bookId,
    book,
    epubReaderRef,
    saveProgress,
    toc,
    currentHref,
    progressRef,
    isSpeaking,
    setToolbarVisible,
    setSelectionMenu,
    setToc,
    setCurrentHref,
    setProgress,
    setCurrentPage,
    setTotalPages,
    currentLocationRef,
    currentCfiRef,
    bookmarks,
    setIsCurrentBookmarked,
    debouncedSaveProgress,
    onTextSelectionOpened: () => {
      setSelectionMenuKey((key) => key + 1);
    },
  });

  useEffect(() => {
    handleBackRef.current = navigation.handleBack;
  }, [navigation.handleBack, handleBackRef]);

  const value = {
    ...navigation,
    toc,
    currentHref,
    progress,
    currentPage,
    totalPages,
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }
  return context;
}
