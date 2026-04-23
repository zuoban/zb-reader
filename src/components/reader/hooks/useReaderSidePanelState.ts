"use client";

import { useCallback, useMemo, useState } from "react";
import { useCurrentChapterTitle } from "./useCurrentChapterTitle";
import type { Bookmark, Note } from "@/lib/db/schema";
import type { TocItem } from "@/types/reader";

type ReaderSidePanelTab = "toc" | "bookmarks" | "notes";

export function useReaderSidePanelState({
  bookTitle,
  bookmarks,
  notes,
}: {
  bookTitle?: string;
  bookmarks: Bookmark[];
  notes: Note[];
}) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ReaderSidePanelTab>("toc");
  const [toc, setToc] = useState<TocItem[]>([]);
  const [currentHref, setCurrentHref] = useState<string | undefined>();

  const currentChapterTitle = useCurrentChapterTitle(toc, currentHref, bookTitle);

  const panelBookmarks = useMemo(
    () =>
      bookmarks.map((bookmark) => ({
        id: bookmark.id,
        label: bookmark.label || "未命名书签",
        location: bookmark.location,
        progress: bookmark.progress || 0,
        createdAt: bookmark.createdAt,
      })),
    [bookmarks]
  );

  const panelNotes = useMemo(
    () =>
      notes.map((note) => ({
        id: note.id,
        selectedText: note.selectedText || "",
        content: note.content || "",
        color: note.color || "#facc15",
        location: note.location,
        createdAt: note.createdAt,
      })),
    [notes]
  );

  const openToc = useCallback(() => {
    setOpen(true);
    setActiveTab("toc");
  }, []);

  return {
    activeTab,
    currentChapterTitle,
    currentHref,
    open,
    openToc,
    panelBookmarks,
    panelNotes,
    setActiveTab,
    setCurrentHref,
    setOpen,
    setToc,
    toc,
  };
}
