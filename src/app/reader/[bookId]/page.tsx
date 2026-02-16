"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import dynamic from "next/dynamic";
import { ReaderToolbar } from "@/components/reader/ReaderToolbar";
import { SidePanel } from "@/components/reader/SidePanel";
import { ReadingSettings } from "@/components/reader/ReadingSettings";
import { TextSelectionMenu } from "@/components/reader/TextSelectionMenu";
import { NoteEditor } from "@/components/reader/NoteEditor";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import type { EpubReaderRef } from "@/components/reader/EpubReader";
import type { Book, Bookmark, Note } from "@/lib/db/schema";

// Dynamic import for EpubReader (client-only, depends on browser APIs)
const EpubReader = dynamic(() => import("@/components/reader/EpubReader"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  ),
});

// Dynamic import for PDF reader
const PdfReader = dynamic<{
  url: string;
  initialPage?: number;
  onPageChange?: (page: number, totalPages: number) => void;
}>(() => import("@/components/reader/PdfReader"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  ),
});

// Dynamic import for TXT reader
const TxtReader = dynamic<{
  url: string;
  initialPage?: number;
  fontSize?: number;
  theme?: "light" | "dark" | "sepia";
  onPageChange?: (page: number, totalPages: number) => void;
}>(() => import("@/components/reader/TxtReader"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  ),
});

interface TocItem {
  label: string;
  href: string;
  id?: string;
  subitems?: TocItem[];
}

function ReaderContent() {
  const router = useRouter();
  const params = useParams();
  const bookId = params.bookId as string;

  const epubReaderRef = useRef<EpubReaderRef>(null);

  // Book data
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);

  // Reader state
  const [toolbarVisible, setToolbarVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentPage, setCurrentPage] = useState<number | undefined>();
  const [totalPages, setTotalPages] = useState<number | undefined>();
  const [initialLocation, setInitialLocation] = useState<string | undefined>();

  // Settings
  const [fontSize, setFontSize] = useState(16);
  const [readerTheme, setReaderTheme] = useState<"light" | "dark" | "sepia">("light");

  // Side panel
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"toc" | "bookmarks" | "notes">("toc");
  const [toc, setToc] = useState<TocItem[]>([]);
  const [currentHref, setCurrentHref] = useState<string | undefined>();

  // Settings panel
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Bookmarks
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isCurrentBookmarked, setIsCurrentBookmarked] = useState(false);

  // Notes
  const [notes, setNotes] = useState<Note[]>([]);
  const [highlights, setHighlights] = useState<Array<{ cfiRange: string; color: string; id: string }>>([]);

  // Text selection
  const [selectionMenu, setSelectionMenu] = useState<{
    visible: boolean;
    position: { x: number; y: number };
    cfiRange: string;
    text: string;
  }>({ visible: false, position: { x: 0, y: 0 }, cfiRange: "", text: "" });
  const [selectionMenuKey, setSelectionMenuKey] = useState(0);

  // Note editor
  const [noteEditor, setNoteEditor] = useState<{
    open: boolean;
    selectedText: string;
    cfiRange: string;
    initialContent?: string;
    initialColor?: string;
    editingId?: string;
  }>({ open: false, selectedText: "", cfiRange: "" });

  // Progress saving
  const currentLocationRef = useRef<string | null>(null);
  const progressRef = useRef(0);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- Load book data ----
  useEffect(() => {
    async function loadBook() {
      try {
        const res = await fetch(`/api/books/${bookId}`);
        if (!res.ok) {
          toast.error("书籍不存在");
          router.push("/bookshelf");
          return;
        }
        const data = await res.json();
        setBook(data.book);

        // Load reading progress
        const progressRes = await fetch(`/api/progress?bookId=${bookId}`);
        const progressData = await progressRes.json();
        if (progressData.progress?.location) {
          setInitialLocation(progressData.progress.location);
          setProgress(progressData.progress.progress || 0);
        }

        // Load bookmarks
        const bmRes = await fetch(`/api/bookmarks?bookId=${bookId}`);
        const bmData = await bmRes.json();
        setBookmarks(bmData.bookmarks || []);

        // Load notes
        const notesRes = await fetch(`/api/notes?bookId=${bookId}`);
        const notesData = await notesRes.json();
        setNotes(notesData.notes || []);
      } catch (error) {
        toast.error("加载失败");
      } finally {
        setLoading(false);
      }
    }

    loadBook();
  }, [bookId, router]);

  // ---- Build highlights from notes ----
  useEffect(() => {
    const hl = notes
      .filter((n) => n.location && n.color)
      .map((n) => ({
        cfiRange: n.location,
        color: n.color || "#facc15",
        id: n.id,
      }));
    setHighlights(hl);
  }, [notes]);

  // ---- Load settings from localStorage ----
  useEffect(() => {
    const savedFontSize = localStorage.getItem("reader-fontSize");
    const savedTheme = localStorage.getItem("reader-theme");
    if (savedFontSize) setFontSize(parseInt(savedFontSize));
    if (savedTheme) setReaderTheme(savedTheme as "light" | "dark" | "sepia");
  }, []);

  // ---- Save progress ----
  const saveProgress = useCallback(async () => {
    if (!bookId || !currentLocationRef.current) return;

    try {
      await fetch("/api/progress", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookId,
          progress: progressRef.current,
          location: currentLocationRef.current,
          currentPage: currentPage,
          totalPages: totalPages,
        }),
      });
    } catch (error) {
      // Silently fail
    }
  }, [bookId, currentPage, totalPages]);

  const debouncedSaveProgress = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(saveProgress, 500);
  }, [saveProgress]);

  // Auto-save timer (every 30s)
  useEffect(() => {
    const interval = setInterval(saveProgress, 30000);
    return () => clearInterval(interval);
  }, [saveProgress]);

  // Save on page leave
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentLocationRef.current && bookId) {
        navigator.sendBeacon(
          "/api/progress",
          new Blob(
            [
              JSON.stringify({
                bookId,
                progress: progressRef.current,
                location: currentLocationRef.current,
              }),
            ],
            { type: "application/json" }
          )
        );
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        saveProgress();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      saveProgress();
    };
  }, [saveProgress, bookId]);

  // ---- Handlers ----
  const handleLocationChange = useCallback(
    (location: {
      cfi: string;
      progress: number;
      currentPage?: number;
      totalPages?: number;
      href?: string;
    }) => {
      currentLocationRef.current = location.cfi;
      progressRef.current = location.progress;
      setProgress(location.progress);
      setCurrentPage(location.currentPage);
      setTotalPages(location.totalPages);
      if (location.href) setCurrentHref(location.href);

      // Check if current location is bookmarked
      const isBookmarked = bookmarks.some((b) => b.location === location.cfi);
      setIsCurrentBookmarked(isBookmarked);

      debouncedSaveProgress();
    },
    [bookmarks, debouncedSaveProgress]
  );

  const handleTocLoaded = useCallback((tocItems: TocItem[]) => {
    setToc(tocItems);
  }, []);

  const handleTextSelected = useCallback((cfiRange: string, text: string) => {
    setSelectionMenuKey((k) => k + 1);
    setSelectionMenu({
      visible: true,
      position: { x: window.innerWidth / 2, y: 80 },
      cfiRange,
      text,
    });
  }, []);

  const handleToggleToolbar = useCallback(() => {
    setToolbarVisible((prev) => !prev);
    setSelectionMenu((prev) => ({ ...prev, visible: false }));
  }, []);

  const handleBack = useCallback(() => {
    saveProgress();
    router.push("/bookshelf");
  }, [saveProgress, router]);

  // ---- Bookmark handlers ----
  const handleToggleBookmark = useCallback(async () => {
    const currentCfi = currentLocationRef.current;
    if (!currentCfi) return;

    const existing = bookmarks.find((b) => b.location === currentCfi);

    if (existing) {
      // Remove bookmark
      try {
        await fetch(`/api/bookmarks/${existing.id}`, { method: "DELETE" });
        setBookmarks((prev) => prev.filter((b) => b.id !== existing.id));
        setIsCurrentBookmarked(false);
        toast.success("已取消书签");
      } catch {
        toast.error("操作失败");
      }
    } else {
      // Add bookmark
      try {
        const res = await fetch("/api/bookmarks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookId,
            location: currentCfi,
            progress: progressRef.current,
            pageNumber: currentPage,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          setBookmarks((prev) => [data.bookmark, ...prev]);
          setIsCurrentBookmarked(true);
          toast.success("已添加书签");
        }
      } catch {
        toast.error("操作失败");
      }
    }
  }, [bookmarks, bookId, currentPage]);

  const handleBookmarkEdit = useCallback(async (id: string, label: string) => {
    try {
      await fetch(`/api/bookmarks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      setBookmarks((prev) =>
        prev.map((b) => (b.id === id ? { ...b, label } : b))
      );
    } catch {
      toast.error("修改失败");
    }
  }, []);

  const handleBookmarkDelete = useCallback(async (id: string) => {
    try {
      await fetch(`/api/bookmarks/${id}`, { method: "DELETE" });
      setBookmarks((prev) => prev.filter((b) => b.id !== id));
      toast.success("已删除书签");
    } catch {
      toast.error("删除失败");
    }
  }, []);

  // ---- Note handlers ----
  const handleHighlight = useCallback(
    async (color: string) => {
      const { cfiRange, text } = selectionMenu;
      if (!cfiRange) return;

      // Optimistically add highlight immediately for instant visual feedback
      const tempId = `temp-${Date.now()}`;
      setHighlights((prev) => [...prev, { cfiRange, color, id: tempId }]);
      setSelectionMenu((prev) => ({ ...prev, visible: false }));

      try {
        const res = await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookId,
            location: cfiRange,
            selectedText: text,
            color,
            progress: progressRef.current,
            pageNumber: currentPage,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          setNotes((prev) => [data.note, ...prev]);
          // Replace temp highlight with real id
          setHighlights((prev) =>
            prev.map((h) => (h.id === tempId ? { ...h, id: data.note.id } : h))
          );
          toast.success("已添加高亮");
        } else {
          // Remove optimistic highlight on failure
          setHighlights((prev) => prev.filter((h) => h.id !== tempId));
        }
      } catch {
        setHighlights((prev) => prev.filter((h) => h.id !== tempId));
        toast.error("操作失败");
      }
    },
    [selectionMenu, bookId, currentPage]
  );

  const handleAddNote = useCallback(() => {
    setNoteEditor({
      open: true,
      selectedText: selectionMenu.text,
      cfiRange: selectionMenu.cfiRange,
    });
    setSelectionMenu((prev) => ({ ...prev, visible: false }));
  }, [selectionMenu]);

  const handleCopyText = useCallback(() => {
    navigator.clipboard.writeText(selectionMenu.text);
    toast.success("已复制");
    setSelectionMenu((prev) => ({ ...prev, visible: false }));
  }, [selectionMenu.text]);

  const handleSaveNote = useCallback(
    async (content: string, color: string) => {
      if (noteEditor.editingId) {
        // Edit existing note — optimistically update highlight color
        setHighlights((prev) =>
          prev.map((h) =>
            h.id === noteEditor.editingId ? { ...h, color } : h
          )
        );
        try {
          await fetch(`/api/notes/${noteEditor.editingId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content, color }),
          });
          setNotes((prev) =>
            prev.map((n) =>
              n.id === noteEditor.editingId ? { ...n, content, color } : n
            )
          );
          toast.success("已更新笔记");
        } catch {
          toast.error("更新失败");
        }
      } else {
        // Create new note — optimistic highlight
        const tempId = `temp-${Date.now()}`;
        if (noteEditor.cfiRange) {
          setHighlights((prev) => [
            ...prev,
            { cfiRange: noteEditor.cfiRange, color, id: tempId },
          ]);
        }
        try {
          const res = await fetch("/api/notes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              bookId,
              location: noteEditor.cfiRange,
              selectedText: noteEditor.selectedText,
              content,
              color,
              progress: progressRef.current,
              pageNumber: currentPage,
            }),
          });
          const data = await res.json();
          if (res.ok) {
            setNotes((prev) => [data.note, ...prev]);
            setHighlights((prev) =>
              prev.map((h) =>
                h.id === tempId ? { ...h, id: data.note.id } : h
              )
            );
            toast.success("已添加笔记");
          } else {
            setHighlights((prev) => prev.filter((h) => h.id !== tempId));
          }
        } catch {
          setHighlights((prev) => prev.filter((h) => h.id !== tempId));
          toast.error("操作失败");
        }
      }
      setNoteEditor({ open: false, selectedText: "", cfiRange: "" });
    },
    [noteEditor, bookId, currentPage]
  );

  const handleNoteDelete = useCallback(async (id: string) => {
    try {
      await fetch(`/api/notes/${id}`, { method: "DELETE" });
      setNotes((prev) => prev.filter((n) => n.id !== id));
      toast.success("已删除笔记");
    } catch {
      toast.error("删除失败");
    }
  }, []);

  const handleNoteEdit = useCallback(
    async (id: string, content: string, color: string) => {
      try {
        await fetch(`/api/notes/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, color }),
        });
        setNotes((prev) =>
          prev.map((n) => (n.id === id ? { ...n, content, color } : n))
        );
        toast.success("已更新笔记");
      } catch {
        toast.error("更新失败");
      }
    },
    []
  );

  // ---- Settings handlers ----
  const handleFontSizeChange = useCallback((size: number) => {
    setFontSize(size);
    localStorage.setItem("reader-fontSize", String(size));
  }, []);

  const handleThemeChange = useCallback((theme: "light" | "dark" | "sepia") => {
    setReaderTheme(theme);
    localStorage.setItem("reader-theme", theme);
  }, []);

  // ---- Navigation handlers ----
  const handleTocItemClick = useCallback((href: string) => {
    epubReaderRef.current?.goToHref(href);
  }, []);

  const handleBookmarkClick = useCallback((location: string) => {
    epubReaderRef.current?.goToLocation(location);
  }, []);

  const handleNoteClick = useCallback((location: string) => {
    epubReaderRef.current?.goToLocation(location);
  }, []);

  const handleProgressChange = useCallback(
    (newProgress: number) => {
      // For EPUB, we generate locations and use CFI-based navigation
      // Use rendition.display with a percentage
      const cfi = epubReaderRef.current?.getCurrentLocation();
      if (cfi) {
        // Simple approach: go to percentage
        epubReaderRef.current?.goToLocation(
          `epubcfi(/6/${Math.max(2, Math.round(newProgress * 100))}!)`
        );
      }
    },
    []
  );

  // ---- Background color based on theme ----
  const bgColors: Record<string, string> = {
    light: "bg-white",
    dark: "bg-[#1a1a2e]",
    sepia: "bg-[#f4ecd8]",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!book) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">书籍不存在</p>
      </div>
    );
  }

  return (
    <div className={`h-screen w-screen ${bgColors[readerTheme] || "bg-white"}`}>
      {/* Reader content area */}
      <div className="h-full w-full">
        {book.format === "epub" && (
          <EpubReader
            ref={epubReaderRef}
            url={`/api/books/${book.id}/file`}
            initialLocation={initialLocation}
            fontSize={fontSize}
            theme={readerTheme}
            onLocationChange={handleLocationChange}
            onTocLoaded={handleTocLoaded}
            onTextSelected={handleTextSelected}
            onCenterClick={handleToggleToolbar}
            highlights={highlights}
          />
        )}

        {book.format === "pdf" && (
          <div onClick={handleToggleToolbar}>
            <PdfReader
              url={`/api/books/${book.id}/file`}
              initialPage={currentPage}
              onPageChange={(page, total) => {
                setCurrentPage(page);
                setTotalPages(total);
                setProgress(total > 0 ? page / total : 0);
                progressRef.current = total > 0 ? page / total : 0;
                currentLocationRef.current = JSON.stringify({ page });
                debouncedSaveProgress();
              }}
            />
          </div>
        )}

        {book.format === "txt" && (
          <div className="h-full" onClick={handleToggleToolbar}>
            <TxtReader
              url={`/api/books/${book.id}/file`}
              initialPage={currentPage}
              fontSize={fontSize}
              theme={readerTheme}
              onPageChange={(page, total) => {
                setCurrentPage(page);
                setTotalPages(total);
                setProgress(total > 0 ? page / total : 0);
                progressRef.current = total > 0 ? page / total : 0;
                currentLocationRef.current = JSON.stringify({ page });
                debouncedSaveProgress();
              }}
            />
          </div>
        )}

        {book.format === "mobi" && (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">
              MOBI 格式支持开发中，请将文件转换为 EPUB 格式后上传
            </p>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <ReaderToolbar
        visible={toolbarVisible}
        title={book.title}
        currentPage={currentPage}
        totalPages={totalPages}
        progress={progress}
        isBookmarked={isCurrentBookmarked}
        onBack={handleBack}
        onToggleToc={() => {
          setSidePanelOpen(true);
          setActiveTab("toc");
        }}
        onToggleBookmark={handleToggleBookmark}
        onToggleNotes={() => {
          setSidePanelOpen(true);
          setActiveTab("notes");
        }}
        onToggleSettings={() => setSettingsOpen(true)}
        onProgressChange={handleProgressChange}
      />

      {/* Side panel (TOC / Bookmarks / Notes) */}
      <SidePanel
        open={sidePanelOpen}
        onOpenChange={setSidePanelOpen}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        toc={toc}
        currentHref={currentHref}
        bookmarks={bookmarks.map((b) => ({
          id: b.id,
          label: b.label || "未命名书签",
          location: b.location,
          progress: b.progress || 0,
          createdAt: b.createdAt,
        }))}
        notes={notes.map((n) => ({
          id: n.id,
          selectedText: n.selectedText || "",
          content: n.content || "",
          color: n.color || "#facc15",
          location: n.location,
          createdAt: n.createdAt,
        }))}
        onTocItemClick={handleTocItemClick}
        onBookmarkClick={handleBookmarkClick}
        onBookmarkDelete={handleBookmarkDelete}
        onBookmarkEdit={handleBookmarkEdit}
        onNoteClick={handleNoteClick}
        onNoteDelete={handleNoteDelete}
        onNoteEdit={handleNoteEdit}
      />

      {/* Reading settings */}
      <ReadingSettings
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        fontSize={fontSize}
        onFontSizeChange={handleFontSizeChange}
        theme={readerTheme}
        onThemeChange={handleThemeChange}
      />

      {/* Text selection menu */}
      <TextSelectionMenu
        visible={selectionMenu.visible}
        position={selectionMenu.position}
        instanceKey={selectionMenuKey}
        onHighlight={handleHighlight}
        onAddNote={handleAddNote}
        onCopy={handleCopyText}
        onClose={() => setSelectionMenu((prev) => ({ ...prev, visible: false }))}
      />

      {/* Note editor dialog */}
      <NoteEditor
        open={noteEditor.open}
        onOpenChange={(open) =>
          setNoteEditor((prev) => ({ ...prev, open }))
        }
        selectedText={noteEditor.selectedText}
        initialContent={noteEditor.initialContent}
        initialColor={noteEditor.initialColor}
        onSave={handleSaveNote}
      />

      <Toaster />
    </div>
  );
}

export default function ReaderPage() {
  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <TooltipProvider>
          <ReaderContent />
        </TooltipProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
