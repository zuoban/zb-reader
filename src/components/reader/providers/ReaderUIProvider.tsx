"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { 
  useReaderSidePanelState, 
  useReaderFullscreen, 
  useIdleTimeout, 
  useReaderKeyboardShortcuts 
} from "@/components/reader/hooks";
import { useBookData } from "./BookDataProvider";
import { useTts } from "./TtsProvider";
import { useReaderContext } from "@/components/reader/ReaderContext";
import type { TocItem } from "@/types/reader";

interface ReaderUIContextValue {
  toolbarVisible: boolean;
  setToolbarVisible: React.Dispatch<React.SetStateAction<boolean>>;
  sidePanelOpen: boolean;
  setSidePanelOpen: (open: boolean) => void;
  activeTab: any;
  setActiveTab: (tab: any) => void;
  toc: TocItem[];
  setToc: (toc: TocItem[]) => void;
  currentHref: string | undefined;
  setCurrentHref: (href: string | undefined) => void;
  openToc: () => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  settingsOpen: boolean;
  setSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  idleCountdown: number | null;
  currentChapterTitle: string | undefined;
}

const ReaderUIContext = createContext<ReaderUIContextValue | null>(null);

export function ReaderUIProvider({ children }: { children: React.ReactNode }) {
  const { book, bookmarks, notes } = useBookData();
  const { isSpeaking } = useTts();
  const { handleBackRef } = useReaderContext();

  const [toolbarVisible, setToolbarVisible] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const sidePanel = useReaderSidePanelState({
    bookTitle: book?.title,
    bookmarks,
    notes,
  });

  const { isFullscreen, toggleFullscreen } = useReaderFullscreen();

  const { idleCountdown } = useIdleTimeout(
    () => handleBackRef.current?.(),
    !isSpeaking
  );

  useReaderKeyboardShortcuts({ onBack: () => handleBackRef.current?.() });

  const value = {
    toolbarVisible,
    setToolbarVisible,
    sidePanelOpen: sidePanel.open,
    setSidePanelOpen: sidePanel.setOpen,
    activeTab: sidePanel.activeTab,
    setActiveTab: sidePanel.setActiveTab,
    toc: sidePanel.toc,
    setToc: sidePanel.setToc,
    currentHref: sidePanel.currentHref,
    setCurrentHref: sidePanel.setCurrentHref,
    openToc: sidePanel.openToc,
    currentChapterTitle: sidePanel.currentChapterTitle,
    isFullscreen,
    toggleFullscreen,
    settingsOpen,
    setSettingsOpen,
    idleCountdown,
  };

  return (
    <ReaderUIContext.Provider value={value}>
      {children}
    </ReaderUIContext.Provider>
  );
}

export function useReaderUI() {
  const context = useContext(ReaderUIContext);
  if (!context) {
    throw new Error("useReaderUI must be used within a ReaderUIProvider");
  }
  return context;
}
