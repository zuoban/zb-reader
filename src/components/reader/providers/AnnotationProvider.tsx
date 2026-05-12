"use client";

import React, { createContext, useContext, useState } from "react";
import { 
  useBookmarkActions, 
  useNoteActions, 
  useReaderSelectionState 
} from "@/components/reader/hooks";
import { useBookData } from "./BookDataProvider";
import { useReaderContext } from "@/components/reader/ReaderContext";

interface AnnotationContextValue {
  isCurrentBookmarked: boolean;
  setIsCurrentBookmarked: (value: boolean) => void;
  handleToggleBookmark: () => Promise<void>;
  handleBookmarkEdit: (id: string, label: string) => Promise<void>;
  handleBookmarkDelete: (id: string) => Promise<void>;
  handleHighlight: (color: string) => Promise<void>;
  handleAddNote: () => void;
  handleCopyText: () => void;
  handleSaveNote: (content: string, color: string) => Promise<void>;
  handleNoteDelete: (id: string) => Promise<void>;
  handleNoteEdit: (id: string, content: string, color: string) => Promise<void>;
  selectionMenu: any;
  setSelectionMenu: React.Dispatch<React.SetStateAction<any>>;
  selectionMenuKey: number;
  setSelectionMenuKey: React.Dispatch<React.SetStateAction<number>>;
  noteEditor: any;
  setNoteEditor: React.Dispatch<React.SetStateAction<any>>;
}

const AnnotationContext = createContext<AnnotationContextValue | null>(null);

export function AnnotationProvider({ children }: { children: React.ReactNode }) {
  const { book, bookmarks, setBookmarks, setNotes, notes } = useBookData();
  const { currentCfiRef, currentPage, progressRef } = useReaderContext();
  const [isCurrentBookmarked, setIsCurrentBookmarked] = useState(false);

  const {
    noteEditor,
    selectionMenu,
    selectionMenuKey,
    setNoteEditor,
    setSelectionMenu,
    setSelectionMenuKey,
  } = useReaderSelectionState();

  const bookmarkActions = useBookmarkActions({
    bookId: book?.id || "",
    currentCfiRef,
    currentPage,
    bookmarks,
    progressRef,
    onBookmarkAdded: (bookmark) => setBookmarks((prev) => [bookmark, ...prev]),
    onBookmarkRemoved: (id) => setBookmarks((prev) => prev.filter((b) => b.id !== id)),
    onBookmarkUpdated: (id, updates) => setBookmarks((prev) => prev.map((b) => b.id === id ? { ...b, ...updates } : b)),
    setIsCurrentBookmarked,
  });

  const noteActions = useNoteActions({
    bookId: book?.id || "",
    selectionMenu,
    noteEditor,
    progressRef,
    currentPage,
    onHighlightAdded: (highlight) => {
      const tempNote = {
        id: highlight.id,
        bookId: book?.id || "",
        userId: "",
        location: highlight.cfiRange,
        selectedText: null,
        content: null,
        color: highlight.color,
        progress: null,
        pageNumber: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setNotes((prev: any) => [tempNote, ...prev]);
    },
    onHighlightRemoved: (id) => setNotes((prev: any) => prev.filter((n: any) => n.id !== id)),
    onHighlightUpdated: (id, updates) => setNotes((prev: any) => prev.map((n: any) => n.id === id ? { ...n, ...updates } : n)),
    onNoteAdded: (note) => setNotes((prev: any) => [note, ...prev]),
    onNoteRemoved: (id) => setNotes((prev: any) => prev.filter((n: any) => n.id !== id)),
    onNoteUpdated: (id, updates) => setNotes((prev: any) => prev.map((n: any) => n.id === id ? { ...n, ...updates } : n)),
    setSelectionMenu,
    setNoteEditor,
  });

  const value = {
    isCurrentBookmarked,
    setIsCurrentBookmarked,
    ...bookmarkActions,
    ...noteActions,
    selectionMenu,
    setSelectionMenu,
    selectionMenuKey,
    setSelectionMenuKey,
    noteEditor,
    setNoteEditor,
  };

  return (
    <AnnotationContext.Provider value={value}>
      {children}
    </AnnotationContext.Provider>
  );
}

export function useAnnotation() {
  const context = useContext(AnnotationContext);
  if (!context) {
    throw new Error("useAnnotation must be used within an AnnotationProvider");
  }
  return context;
}
