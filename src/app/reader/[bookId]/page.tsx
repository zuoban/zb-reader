"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import dynamic from "next/dynamic";
import { ReaderErrorBoundary } from "@/components/reader/ReaderErrorBoundary";
import { ReaderToolbar } from "@/components/reader/ReaderToolbar";
import { SidePanel } from "@/components/reader/SidePanel";
import { ReadingSettings } from "@/components/reader/ReadingSettings";
import { TextSelectionMenu } from "@/components/reader/TextSelectionMenu";
import { NoteEditor } from "@/components/reader/NoteEditor";
import { TtsFloatingControl } from "@/components/reader/TtsFloatingControl";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import type { EpubReaderRef } from "@/components/reader/EpubReader";
import type { Book, Bookmark, Note } from "@/lib/db/schema";
import type { BrowserVoiceOption, TtsConfigApiItem } from "@/lib/tts";
import {
  cacheBook,
  getCachedBook,
} from "@/lib/book-cache";

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
  onRegisterController?: (controller: { nextPage: () => boolean; prevPage: () => boolean }) => void;
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
  activeTtsParagraph?: string;
  ttsPlaybackProgress?: number;
  onPageChange?: (page: number, totalPages: number) => void;
  onRegisterController?: (controller: { nextPage: () => boolean; prevPage: () => boolean; scrollDown: (amount?: number) => void; scrollUp: (amount?: number) => void }) => void;
  ttsImmersiveMode?: boolean;
}>(() => import("@/components/reader/TxtReader"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  ),
});

const DEFAULT_LEGADO_PRELOAD_COUNT = 3;
const DEFAULT_MICROSOFT_PRELOAD_COUNT = 3;
const MAX_TTS_RETRY_COUNT = 5;
const TTS_RETRY_DELAY_MS = 450;
const IS_DEV = process.env.NODE_ENV !== "production";

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
  const [bookUrl, setBookUrl] = useState<string | null>(null);
  const bookUrlRef = useRef<string | null>(null);

  // Reader state
  const [toolbarVisible, setToolbarVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentPage, setCurrentPage] = useState<number | undefined>();
  const [totalPages, setTotalPages] = useState<number | undefined>();
  const [initialLocation, setInitialLocation] = useState<string | undefined>();

  // Settings
  const [fontSize, setFontSize] = useState(16);
  const [readerTheme, setReaderTheme] = useState<"light" | "dark" | "sepia">("light");
  const [ttsEngine, setTtsEngine] = useState<"browser" | "legado">("browser");
  const [browserVoices, setBrowserVoices] = useState<BrowserVoiceOption[]>([]);
  const [selectedBrowserVoiceId, setSelectedBrowserVoiceId] = useState("");
  const [ttsRate, setTtsRate] = useState(1);
  const [ttsPitch, setTtsPitch] = useState(1);
  const [ttsVolume, setTtsVolume] = useState(1);
  const [microsoftPreloadCount, setMicrosoftPreloadCount] = useState(
    DEFAULT_MICROSOFT_PRELOAD_COUNT
  );
  const [legadoRate, setLegadoRate] = useState(50);
  const [legadoConfigs, setLegadoConfigs] = useState<TtsConfigApiItem[]>([]);
  const [selectedLegadoConfigId, setSelectedLegadoConfigId] = useState("");
  const [legadoImportText, setLegadoImportText] = useState("");
  const [legadoImporting, setLegadoImporting] = useState(false);
  const [legadoPreloadCount, setLegadoPreloadCount] = useState(
    DEFAULT_LEGADO_PRELOAD_COUNT
  );
  const [ttsImmersiveMode, setTtsImmersiveMode] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsPlaybackProgress, setTtsPlaybackProgress] = useState(0);

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
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const txtReaderControllerRef = useRef<{ nextPage: () => boolean; prevPage: () => boolean; scrollDown: (amount?: number) => void; scrollUp: (amount?: number) => void } | null>(null);
  const pdfReaderControllerRef = useRef<{ nextPage: () => boolean; prevPage: () => boolean } | null>(null);
  const ttsSessionRef = useRef(0);
  const settingsLoadedRef = useRef(false);
  const settingsSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ttsResumeRef = useRef<(() => void) | null>(null);
  const [activeTtsParagraph, setActiveTtsParagraph] = useState("");
  const currentParagraphIndexRef = useRef(0);
  const allParagraphsRef = useRef<string[]>([]);
  const readParagraphsHashRef = useRef<Set<string>>(new Set());
  const [ttsCurrentIndex, setTtsCurrentIndex] = useState(0);
  const [ttsTotalParagraphs, setTtsTotalParagraphs] = useState(0);

  // 跟踪 TTS 设置的上次值，用于检测设置变化
  const prevTtsSettingsRef = useRef({ rate: ttsRate, pitch: ttsPitch, volume: ttsVolume });

  const wait = useCallback((ms: number) => {
    return new Promise<void>((resolve) => {
      setTimeout(resolve, ms);
    });
  }, []);

  const isRetryableTtsError = useCallback((error: unknown) => {
    if (!(error instanceof Error)) return true;

    if (!error.message.startsWith("audio_play_error")) {
      return true;
    }

    return !error.message.includes("NotAllowedError");
  }, []);

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

        // Load or cache book file
        const cached = await getCachedBook(bookId);
        let fileUrl: string;

        if (cached) {
          fileUrl = URL.createObjectURL(new Blob([cached]));
          toast.success("使用缓存书籍");
        } else {
          const fileRes = await fetch(`/api/books/${bookId}/file`);
          if (!fileRes.ok) {
            throw new Error("Failed to load book file");
          }
          const fileBuffer = await fileRes.arrayBuffer();
          fileUrl = URL.createObjectURL(new Blob([fileBuffer]));
          await cacheBook(bookId, fileBuffer);
        }

        setBookUrl(fileUrl);
        bookUrlRef.current = fileUrl;
      } catch (error) {
        console.error("Failed to load book:", error);
        toast.error("加载失败");
      } finally {
        setLoading(false);
      }
    }

    loadBook();

    return () => {
      if (bookUrlRef.current) {
        URL.revokeObjectURL(bookUrlRef.current);
      }
    };
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

  // ---- Load settings from database ----
  useEffect(() => {
    const loadReaderSettings = async () => {
      try {
        const res = await fetch("/api/reader-settings");
        if (!res.ok) return;

        const data = (await res.json()) as {
          settings?: {
            fontSize?: number;
            theme?: "light" | "dark" | "sepia";
            ttsEngine?: "browser" | "legado";
            browserVoiceId?: string;
            ttsRate?: number;
            ttsPitch?: number;
            ttsVolume?: number;
            microsoftPreloadCount?: number;
            legadoRate?: number;
            legadoConfigId?: string;
            legadoPreloadCount?: number;
            ttsImmersiveMode?: boolean;
          };
        };

        const settings = data.settings;
        if (!settings) return;

        if (typeof settings.fontSize === "number") {
          setFontSize(Math.min(28, Math.max(12, settings.fontSize)));
        }
        if (
          settings.theme === "light" ||
          settings.theme === "dark" ||
          settings.theme === "sepia"
        ) {
          setReaderTheme(settings.theme);
        }
        if (settings.ttsEngine === "browser" || settings.ttsEngine === "legado") {
          setTtsEngine(settings.ttsEngine);
        }
        if (typeof settings.browserVoiceId === "string") {
          setSelectedBrowserVoiceId(settings.browserVoiceId);
        }
        if (typeof settings.ttsRate === "number") {
          setTtsRate(Math.min(5, Math.max(1, settings.ttsRate)));
        }
        if (typeof settings.ttsPitch === "number") {
          setTtsPitch(Math.min(2, Math.max(0.5, settings.ttsPitch)));
        }
        if (typeof settings.ttsVolume === "number") {
          setTtsVolume(Math.min(1, Math.max(0, settings.ttsVolume)));
        }
        if (
          typeof settings.microsoftPreloadCount === "number" &&
          [1, 2, 3, 5].includes(settings.microsoftPreloadCount)
        ) {
          setMicrosoftPreloadCount(settings.microsoftPreloadCount);
        }
        if (typeof settings.legadoRate === "number") {
          setLegadoRate(Math.min(500, Math.max(1, settings.legadoRate)));
        }
        if (typeof settings.legadoConfigId === "string") {
          setSelectedLegadoConfigId(settings.legadoConfigId);
        }
        if (
          typeof settings.legadoPreloadCount === "number" &&
          [1, 2, 3, 5].includes(settings.legadoPreloadCount)
        ) {
          setLegadoPreloadCount(settings.legadoPreloadCount);
        }
        if (typeof settings.ttsImmersiveMode === "boolean") {
          setTtsImmersiveMode(settings.ttsImmersiveMode);
        }
      } catch {
        // ignore
      } finally {
        settingsLoadedRef.current = true;
      }
    };

    loadReaderSettings();

    return () => {
      if (settingsSaveTimerRef.current) {
        clearTimeout(settingsSaveTimerRef.current);
        settingsSaveTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!settingsLoadedRef.current) return;

    if (settingsSaveTimerRef.current) {
      clearTimeout(settingsSaveTimerRef.current);
      settingsSaveTimerRef.current = null;
    }

    settingsSaveTimerRef.current = setTimeout(async () => {
      try {
        await fetch("/api/reader-settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fontSize,
            theme: readerTheme,
            ttsEngine,
            browserVoiceId: selectedBrowserVoiceId,
            ttsRate,
            ttsPitch,
            ttsVolume,
            microsoftPreloadCount,
            legadoRate,
            legadoConfigId: selectedLegadoConfigId,
            legadoPreloadCount,
            ttsImmersiveMode,
          }),
        });
      } catch {
        // ignore
      }
    }, 220);
  }, [
    fontSize,
    legadoPreloadCount,
    legadoRate,
    microsoftPreloadCount,
    readerTheme,
    selectedBrowserVoiceId,
    selectedLegadoConfigId,
    ttsEngine,
    ttsImmersiveMode,
    ttsPitch,
    ttsRate,
    ttsVolume,
  ]);

  useEffect(() => {
    setTtsPlaybackProgress(0);
  }, [activeTtsParagraph]);

  const stopSpeaking = useCallback(() => {
    ttsSessionRef.current += 1;
    ttsResumeRef.current = null;
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    setActiveTtsParagraph("");
    setTtsPlaybackProgress(0);
    setIsSpeaking(false);
  }, []);

  const loadLegadoConfigs = useCallback(async () => {
    try {
      const res = await fetch("/api/tts");
      if (!res.ok) return;
      const data = (await res.json()) as TtsConfigApiItem[];
      setLegadoConfigs(data || []);
      if (!selectedLegadoConfigId && data.length > 0) {
        setSelectedLegadoConfigId(data[0].id);
      }
    } catch {
      // ignore
    }
  }, [selectedLegadoConfigId]);

  useEffect(() => {
    loadLegadoConfigs();
  }, [loadLegadoConfigs]);

  useEffect(() => {
    const loadVoices = async () => {
      try {
        const res = await fetch("/api/tts/microsoft/voices");
        if (!res.ok) return;
        const data = (await res.json()) as { voices?: BrowserVoiceOption[] };
        const mapped = data.voices || [];
        setBrowserVoices(mapped);
        setSelectedBrowserVoiceId((prev) => {
          if (mapped.length === 0) return prev;
          if (prev && mapped.some((voice) => voice.id === prev)) return prev;
          return mapped[0].id;
        });
      } catch {
        // ignore
      }
    };

    loadVoices();
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
    if (isSpeaking) {
      return;
    }
    setToolbarVisible((prev) => !prev);
    setSelectionMenu((prev) => ({ ...prev, visible: false }));
  }, [isSpeaking]);

  const handleBack = useCallback(() => {
    saveProgress();
    router.push("/bookshelf");
  }, [saveProgress, router]);

  // ---- Esc key to go back ----
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleBack();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleBack]);

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
  }, []);

  const handleThemeChange = useCallback((theme: "light" | "dark" | "sepia") => {
    setReaderTheme(theme);
  }, []);

  const getCurrentReadableText = useCallback(() => {
    if (!book) return "";

    if (book.format === "epub") {
      return epubReaderRef.current?.getCurrentText()?.trim() || "";
    }

    if (book.format === "txt") {
      const txtNode = document.querySelector("[data-reader-txt-page='true']");
      return txtNode?.textContent?.trim() || "";
    }

    if (book.format === "pdf") {
      const spans = document.querySelectorAll(
        ".react-pdf__Page__textContent span"
      );
      const text = Array.from(spans)
        .map((span) => span.textContent || "")
        .join(" ")
        .trim();
      return text;
    }

    return "";
  }, [book]);

  const handleLegadoImport = useCallback(async () => {
    const raw = legadoImportText.trim();
    if (!raw) {
      toast.error("请先粘贴配置JSON");
      return;
    }

    let payload: unknown;
    try {
      payload = JSON.parse(raw);
    } catch {
      toast.error("JSON格式不正确");
      return;
    }

    try {
      setLegadoImporting(true);
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || "导入失败");
        return;
      }
      toast.success(data?.message || "导入成功");
      setLegadoImportText("");
      await loadLegadoConfigs();
    } catch {
      toast.error("导入失败");
    } finally {
      setLegadoImporting(false);
    }
  }, [legadoImportText, loadLegadoConfigs]);

  const requestMicrosoftSpeech = useCallback(
    async (text: string) => {
      const ratePercent = Math.round((ttsRate - 1) * 100);
      const pitchPercent = Math.round((ttsPitch - 1) * 100);
      const volumePercent = Math.round(ttsVolume * 100);

      const res = await fetch("/api/tts/microsoft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          voiceName: selectedBrowserVoiceId,
          rate: ratePercent,
          pitch: pitchPercent,
          volume: volumePercent,
        }),
      });

      if (res.status === 204) {
        return "";
      }

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string; details?: string }
          | null;
        const message = data?.error || "朗读失败";
        const details = data?.details ? `：${data.details}` : "";
        throw new Error(`${message}${details}`);
      }

      const audioBlob = await res.blob();
      return URL.createObjectURL(audioBlob);
    },
    [selectedBrowserVoiceId, ttsPitch, ttsRate, ttsVolume]
  );

  const playAudioSource = useCallback(
    async (
      source: string,
      sessionId: number,
      options?: {
        onEnd?: () => void;
        onCleanup?: () => void;
        debugMeta?: { engine: "microsoft" | "legado"; paragraphIndex?: number; paragraph?: string };
      }
    ) => {
      if (ttsSessionRef.current !== sessionId) return;

      if (source === "") {
        options?.onEnd?.();
        return;
      }

      if (!currentAudioRef.current) {
        currentAudioRef.current = new Audio();
      }

      const audio = currentAudioRef.current;

      const dispose = () => {
        audio.ontimeupdate = null;
        audio.onended = null;
        audio.onerror = null;
      };

      await new Promise<void>((resolve, reject) => {
        audio.pause();
        audio.currentTime = 0;
        audio.src = source;

        audio.ontimeupdate = () => {
          if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
          setTtsPlaybackProgress(
            Math.min(1, Math.max(0, audio.currentTime / audio.duration))
          );
        };

        audio.onended = () => {
          dispose();
          setTtsPlaybackProgress(1);
          options?.onEnd?.();
          resolve();
        };

        audio.onerror = () => {
          dispose();
          options?.onCleanup?.();
          if (IS_DEV) {
            console.warn("[TTS] audio element onerror", options?.debugMeta);
          }
          reject(new Error("audio_play_error:MediaError"));
        };

        audio.play().catch((error) => {
          const reason =
            error instanceof DOMException
              ? error.name
              : error instanceof Error
                ? error.name || "UnknownError"
                : "UnknownError";

          dispose();

          if (reason === "NotAllowedError") {
            ttsResumeRef.current = () => {
              if (ttsSessionRef.current !== sessionId) return;
              audio.play().catch(() => {
                // user can click again to retry resume
              });
            };
            toast.error("播放被浏览器拦截，点击朗读按钮继续");
          }

          if (IS_DEV) {
            console.warn("[TTS] audio.play rejected", {
              ...options?.debugMeta,
              reason,
            });
          }

          reject(new Error(`audio_play_error:${reason}`));
        });
      });
    },
    []
  );

  // 当 TTS 设置变化时，如果正在播放，重新播放当前段落
  useEffect(() => {
    const prev = prevTtsSettingsRef.current;
    const current = { rate: ttsRate, pitch: ttsPitch, volume: ttsVolume };

    // 检查是否有变化
    const hasChanged =
      prev.rate !== current.rate ||
      prev.pitch !== current.pitch ||
      prev.volume !== current.volume;

    if (hasChanged && isSpeaking && activeTtsParagraph && ttsEngine === "browser") {
      // 更新 ref
      prevTtsSettingsRef.current = current;

      // 重新播放当前段落
      const sessionId = ttsSessionRef.current;
      const currentIndex = currentParagraphIndexRef.current;

      // 停止当前音频
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
      }

      // 重新播放当前段落
      const replayParagraph = async () => {
        try {
          const objectUrl = await requestMicrosoftSpeech(activeTtsParagraph);
          if (ttsSessionRef.current !== sessionId) return;

          await playAudioSource(objectUrl, sessionId, {
            onCleanup: () => URL.revokeObjectURL(objectUrl),
            onEnd: () => URL.revokeObjectURL(objectUrl),
            debugMeta: { engine: "microsoft", paragraphIndex: currentIndex },
          });
        } catch {
          // 忽略错误，让循环继续
        }
      };

      void replayParagraph();
    } else {
      // 只更新 ref，不重新播放
      prevTtsSettingsRef.current = current;
    }
  }, [ttsRate, ttsPitch, ttsVolume, isSpeaking, activeTtsParagraph, ttsEngine]);

  const speakWithBrowserParagraphs = useCallback(
    async (paragraphs: string[], sessionId: number, startIndex = 0) => {
      const queue = paragraphs.filter((item) => item.trim().length > 0);
      if (queue.length === 0) {
        toast.error("当前页面没有可朗读段落");
        return;
      }

      setIsSpeaking(true);

      const preparedTaskMap = new Map<number, Promise<string>>();

      const ensurePreloadWindow = (windowStart: number) => {
        for (
          let cursor = windowStart;
          cursor < Math.min(queue.length, windowStart + microsoftPreloadCount);
          cursor += 1
        ) {
          if (!preparedTaskMap.has(cursor)) {
            const task = requestMicrosoftSpeech(queue[cursor]);
            task.catch(() => {
              // avoid unhandled promise rejection for preloaded items
            });
            preparedTaskMap.set(cursor, task);
          }
        }
      };

      ensurePreloadWindow(0);

      for (let i = 0; i < queue.length; i += 1) {
        if (ttsSessionRef.current !== sessionId) {
          return;
        }

        currentParagraphIndexRef.current = startIndex + i;
        setTtsCurrentIndex(startIndex + i);
        const paragraph = queue[i];
        setActiveTtsParagraph(paragraph);

        // 跳过已读的段落（避免跨页重复朗读）
        const hash = paragraph.slice(0, 50);
        if (readParagraphsHashRef.current.has(hash)) {
          // 跳过后，仍然需要预加载，因为 i 在继续递增
          ensurePreloadWindow(i + 1);
          continue;
        }

        ensurePreloadWindow(i + 1);

        let paragraphSucceeded = false;
        let lastError: unknown = null;

        for (let attempt = 1; attempt <= MAX_TTS_RETRY_COUNT; attempt += 1) {
          if (ttsSessionRef.current !== sessionId) {
            return;
          }

          let objectUrl: string | null = null;

          try {
            objectUrl = await (
              attempt === 1
                ? preparedTaskMap.get(i) ?? requestMicrosoftSpeech(paragraph)
                : requestMicrosoftSpeech(paragraph)
            );

            await new Promise<void>((resolve, reject) => {
              if (ttsSessionRef.current !== sessionId) {
                resolve();
                return;
              }

              void playAudioSource(objectUrl as string, sessionId, {
                onCleanup: () => {
                  if (objectUrl) {
                    URL.revokeObjectURL(objectUrl);
                    objectUrl = null;
                  }
                },
                onEnd: () => {
                  if (objectUrl) {
                    URL.revokeObjectURL(objectUrl);
                    objectUrl = null;
                  }
                },
                debugMeta: {
                  engine: "microsoft",
                  paragraphIndex: startIndex + i,
                },
              })
                .then(resolve)
                .catch(reject);
            });

            paragraphSucceeded = true;
            break;
          } catch (error) {
            lastError = error;
            if (objectUrl) {
              URL.revokeObjectURL(objectUrl);
            }
            if (currentAudioRef.current) {
              currentAudioRef.current.pause();
              currentAudioRef.current.currentTime = 0;
            }

            const canRetry = isRetryableTtsError(error);

            if (attempt < MAX_TTS_RETRY_COUNT && canRetry) {
              if (ttsSessionRef.current === sessionId) {
                toast(`朗读失败，正在重试（${attempt + 1}/${MAX_TTS_RETRY_COUNT}）`);
              }
              // eslint-disable-next-line no-await-in-loop
              await wait(TTS_RETRY_DELAY_MS);
              continue;
            }

            break;
          }
        }

        if (!paragraphSucceeded) {
          if (ttsSessionRef.current === sessionId) {
            setActiveTtsParagraph("");
            setIsSpeaking(false);
            if (!isRetryableTtsError(lastError)) {
              toast.error("音频播放失败，请检查浏览器自动播放权限");
            } else {
              toast.error(`朗读失败，已重试${MAX_TTS_RETRY_COUNT}次`);
            }
          }
          throw new Error("speech_failed");
        }
      }

      for (const [, task] of preparedTaskMap) {
        task
          .then((objectUrl) => {
            URL.revokeObjectURL(objectUrl);
          })
          .catch(() => {
            // ignore preload cleanup errors
          });
      }
    },
    [
      isRetryableTtsError,
      microsoftPreloadCount,
      playAudioSource,
      requestMicrosoftSpeech,
      wait,
    ]
  );

  type PreparedLegadoSpeech =
    | { kind: "blob"; objectUrl: string }
    | { kind: "url"; audioUrl: string }
    | { kind: "text"; text: string };

  const requestLegadoSpeech = useCallback(
    async (text: string): Promise<PreparedLegadoSpeech> => {
      const res = await fetch("/api/tts/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          configId: selectedLegadoConfigId,
          text,
          speakSpeed: legadoRate,
        }),
      });

      const contentType = res.headers.get("content-type") || "";

      if (res.ok && contentType.startsWith("audio/")) {
        const audioBlob = await res.blob();
        return { kind: "blob", objectUrl: URL.createObjectURL(audioBlob) };
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "朗读失败");
      }

      const audioUrl = typeof data?.audioUrl === "string" ? data.audioUrl : "";
      const speechText = typeof data?.text === "string" ? data.text.trim() : "";

      if (audioUrl) {
        return { kind: "url", audioUrl };
      }

      if (speechText) {
        return { kind: "text", text: speechText };
      }

      throw new Error("未获取到可朗读内容");
    },
    [selectedLegadoConfigId, legadoRate]
  );

  const playLegadoPreparedSpeech = useCallback(
    async (
      prepared: PreparedLegadoSpeech,
      paragraph: string,
      sessionId: number
    ) => {
      if (ttsSessionRef.current !== sessionId) return;

      setActiveTtsParagraph(paragraph);
      setIsSpeaking(true);

      if (prepared.kind === "text") {
        await speakWithBrowserParagraphs([prepared.text], sessionId);
        return;
      }

      const source = prepared.kind === "blob" ? prepared.objectUrl : prepared.audioUrl;

      await playAudioSource(source, sessionId, {
        onCleanup: () => {
          if (prepared.kind === "blob") {
            URL.revokeObjectURL(prepared.objectUrl);
          }
        },
        onEnd: () => {
          if (prepared.kind === "blob") {
            URL.revokeObjectURL(prepared.objectUrl);
          }
        },
        debugMeta: {
          engine: "legado",
          paragraph: paragraph.slice(0, 48),
        },
      });
    },
    [playAudioSource, speakWithBrowserParagraphs]
  );

  const speakWithLegadoParagraphs = useCallback(
    async (paragraphs: string[], sessionId: number, startIndex = 0) => {
      if (!selectedLegadoConfigId) {
        toast.error("请先选择 Legado 配置");
        return;
      }

      const queue = paragraphs.filter((item) => item.trim().length > 0);
      if (queue.length === 0) {
        toast.error("当前页面没有可朗读段落");
        return;
      }

      const preparedTaskMap = new Map<number, Promise<PreparedLegadoSpeech>>();

      const ensurePreloadWindow = (windowStart: number) => {
        for (
          let cursor = windowStart;
          cursor < Math.min(queue.length, windowStart + legadoPreloadCount);
          cursor += 1
        ) {
          if (!preparedTaskMap.has(cursor)) {
            const task = requestLegadoSpeech(queue[cursor]);
            task.catch(() => {
              // avoid unhandled promise rejection for preloaded items
            });
            preparedTaskMap.set(cursor, task);
          }
        }
      };

      ensurePreloadWindow(0);

      for (let index = 0; index < queue.length; index += 1) {
        if (ttsSessionRef.current !== sessionId) {
          return;
        }

        currentParagraphIndexRef.current = startIndex + index;
        setTtsCurrentIndex(startIndex + index);
        const paragraph = queue[index];

        // 跳过已读的段落（避免跨页重复朗读）
        const hash = paragraph.slice(0, 50);
        if (readParagraphsHashRef.current.has(hash)) {
          ensurePreloadWindow(index + 1);
          continue;
        }

        ensurePreloadWindow(index + 1);
        const currentPreparedPromise =
          preparedTaskMap.get(index) ?? requestLegadoSpeech(paragraph);

        let paragraphSucceeded = false;
        let lastError: unknown = null;

        for (let attempt = 1; attempt <= MAX_TTS_RETRY_COUNT; attempt += 1) {
          if (ttsSessionRef.current !== sessionId) {
            return;
          }

          try {
            const prepared =
              // eslint-disable-next-line no-await-in-loop
              await (attempt === 1
                ? currentPreparedPromise
                : requestLegadoSpeech(paragraph));
            // eslint-disable-next-line no-await-in-loop
            await playLegadoPreparedSpeech(prepared, paragraph, sessionId);
            paragraphSucceeded = true;
            break;
          } catch (error) {
            lastError = error;
            const canRetry = isRetryableTtsError(error);

            if (attempt < MAX_TTS_RETRY_COUNT && canRetry) {
              if (ttsSessionRef.current === sessionId) {
                toast(`朗读失败，正在重试（${attempt + 1}/${MAX_TTS_RETRY_COUNT}）`);
              }
              // eslint-disable-next-line no-await-in-loop
              await wait(TTS_RETRY_DELAY_MS);
              continue;
            }

            break;
          }
        }

        if (!paragraphSucceeded) {
          if (ttsSessionRef.current === sessionId) {
            setActiveTtsParagraph("");
            setIsSpeaking(false);
            if (!isRetryableTtsError(lastError)) {
              toast.error("音频播放失败，请检查浏览器自动播放权限");
            } else {
              toast.error(`朗读失败，已重试${MAX_TTS_RETRY_COUNT}次`);
            }
          }
          return;
        }
      }
    },
    [
      legadoPreloadCount,
      playLegadoPreparedSpeech,
      requestLegadoSpeech,
      selectedLegadoConfigId,
      wait,
      isRetryableTtsError,
    ]
  );

  const getReadableParagraphs = useCallback(() => {
    if (!book) return [] as string[];

    if (book.format === "epub") {
      const paragraphs = epubReaderRef.current?.getCurrentParagraphs?.() || [];
      return paragraphs;
    }

    if (book.format === "txt") {
      const txtNode = document.querySelector("[data-reader-txt-page='true']");
      const text = txtNode?.textContent?.trim() || "";
      return text
        .split(/\n\s*\n+/)
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
    }

    if (book.format === "pdf") {
      const spans = document.querySelectorAll(
        ".react-pdf__Page__textContent span"
      );
      const text = Array.from(spans)
        .map((span) => span.textContent || "")
        .join(" ")
        .trim();
      if (!text) return [];
      const chunks = text
        .split(/(?<=[。！？.!?])\s+/)
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
      return chunks.length > 0 ? chunks : [text];
    }

    return [] as string[];
  }, [book]);

  const getPageIdentity = useCallback(() => {
    if (!book) return "";

    if (book.format === "epub") {
      return currentLocationRef.current || "";
    }

    if (book.format === "txt" || book.format === "pdf") {
      return `${currentPage || 0}/${totalPages || 0}`;
    }

    return "";
  }, [book, currentPage, totalPages]);

  const waitForPageChange = useCallback(
    async (previousIdentity: string, sessionId: number) => {
      const startedAt = Date.now();
      while (Date.now() - startedAt < 5000) {
        if (ttsSessionRef.current !== sessionId) {
          return false;
        }

        if (getPageIdentity() !== previousIdentity) {
          return true;
        }

        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => setTimeout(resolve, 120));
      }
      return false;
    },
    [getPageIdentity]
  );

  const tryAutoTurnPage = useCallback(
    async (sessionId: number) => {
      if (!book) return false;

      const previousIdentity = getPageIdentity();

      if (book.format === "epub") {
        if (progressRef.current >= 0.999) {
          return false;
        }
        epubReaderRef.current?.scrollDown();
      } else if (book.format === "txt") {
        txtReaderControllerRef.current?.scrollDown?.();
      } else if (book.format === "pdf") {
        if (!currentPage || !totalPages || currentPage >= totalPages) {
          return false;
        }
        const moved = pdfReaderControllerRef.current?.nextPage();
        if (!moved) return false;
      } else {
        return false;
      }

      return waitForPageChange(previousIdentity, sessionId);
    },
    [book, currentPage, getPageIdentity, totalPages, waitForPageChange]
  );

  const handleToggleTts = useCallback(async () => {
    if (isSpeaking) {
      stopSpeaking();
      return;
    }

    if (ttsResumeRef.current) {
      setIsSpeaking(true);
      const resume = ttsResumeRef.current;
      ttsResumeRef.current = null;
      resume();
      return;
    }

    ttsSessionRef.current += 1;
    currentParagraphIndexRef.current = 0;
    readParagraphsHashRef.current.clear();
    const sessionId = ttsSessionRef.current;

    // 对于 EPUB，如果第一个段落不完整（跨页），先翻回上一页
    if (book?.format === "epub") {
      const isComplete = epubReaderRef.current?.isFirstVisibleParagraphComplete?.();
      if (isComplete === false) {
        epubReaderRef.current?.prevPage();
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }

    // 获取当前页面的段落
    let paragraphs = getReadableParagraphs();
    
    // 如果获取不到，稍作等待重试（可能页面刚加载）
    if (paragraphs.length === 0) {
      await new Promise((resolve) => setTimeout(resolve, 220));
      paragraphs = getReadableParagraphs();
    }

    if (paragraphs.length === 0) {
      toast.error("当前页面没有可朗读段落");
      return;
    }

    // 更新段落引用
    allParagraphsRef.current = paragraphs;
    setTtsTotalParagraphs(paragraphs.length);

    // 确定起始索引：
    // 如果 currentParagraphIndexRef 在有效范围内，就从那里开始
    // 否则重置为 0
    if (currentParagraphIndexRef.current >= paragraphs.length || currentParagraphIndexRef.current < 0) {
      currentParagraphIndexRef.current = 0;
    }
    setTtsCurrentIndex(currentParagraphIndexRef.current);

    // 如果没有在朗读，设置状态为朗读
    setIsSpeaking(true);

    // 开始朗读循环
    while (ttsSessionRef.current === sessionId) {
      // 在循环开始时再次检查段落（因为翻页后会变）
      if (paragraphs.length === 0) {
          paragraphs = getReadableParagraphs();
          if (paragraphs.length === 0) {
            // 再次尝试等待
             await new Promise((resolve) => setTimeout(resolve, 220));
             paragraphs = getReadableParagraphs();
          }
          if (paragraphs.length === 0) {
             toast.error("没有更多可朗读内容");
             break;
          }
          // 翻页后，从头开始读新的一页
          currentParagraphIndexRef.current = 0;
          setTtsCurrentIndex(0);
          allParagraphsRef.current = paragraphs;
          setTtsTotalParagraphs(paragraphs.length);
      }

      // 从当前索引开始切片
      const startIndex = currentParagraphIndexRef.current;
      const paragraphsToRead = paragraphs.slice(startIndex);

      if (paragraphsToRead.length === 0) {
          // 当前页读完了，尝试翻页
          const moved = await tryAutoTurnPage(sessionId);
          if (!moved) break;
          // 翻页后清空当前段落，以便下一次循环重新获取
          paragraphs = []; 
          continue; 
      }

      if (ttsEngine === "browser") {
        try {
          await speakWithBrowserParagraphs(paragraphsToRead, sessionId, startIndex);
          // 朗读成功后，记录这些段落的哈希
          paragraphsToRead.forEach(p => {
            readParagraphsHashRef.current.add(p.slice(0, 50));
          });
        } catch {
          break;
        }
      } else {
        try {
          await speakWithLegadoParagraphs(paragraphsToRead, sessionId, startIndex);
          // 朗读成功后，记录这些段落的哈希
          paragraphsToRead.forEach(p => {
            readParagraphsHashRef.current.add(p.slice(0, 50));
          });
        } catch {
          break;
        }
      }

      if (ttsSessionRef.current !== sessionId) {
        break;
      }
      
      // 当前页读完（speak 函数返回意味着这一批读完了），准备翻页
      const moved = await tryAutoTurnPage(sessionId);
      if (!moved) {
        break;
      }
      // 翻页成功，清空段落缓存，下一轮循环会重新获取
      paragraphs = [];
    }

    if (ttsSessionRef.current === sessionId) {
      setActiveTtsParagraph("");
      setIsSpeaking(false);
    }
  }, [
    getReadableParagraphs,
    speakWithBrowserParagraphs,
    speakWithLegadoParagraphs,
    stopSpeaking,
    tryAutoTurnPage,
    ttsEngine,
  ]);

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, [stopSpeaking]);

  const handleTtsPrevParagraph = useCallback(() => {
    // 如果没有可读段落，尝试获取一下（首次未开始朗读时可能为空）
    let paragraphs = allParagraphsRef.current;
    if (paragraphs.length === 0) {
      paragraphs = getReadableParagraphs();
      allParagraphsRef.current = paragraphs;
    }
    
    if (paragraphs.length === 0) return;

    const newIndex = Math.max(0, currentParagraphIndexRef.current - 1);
    
    // 如果已经在最前，或者没有变化，则不处理
    if (newIndex === currentParagraphIndexRef.current && currentParagraphIndexRef.current === 0) return;

    // 1. 停止当前的朗读
    ttsSessionRef.current += 1;
    const sessionId = ttsSessionRef.current;
    
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
    }

    // 2. 更新位置
    currentParagraphIndexRef.current = newIndex;
    
      // 3. 仅更新高亮，不自动播放。
    // 但是这里有个问题：如果之前正在播放，用户期望的是切歌（切段）继续播？
    // 还是仅仅移动光标？
    // 通常 "上一首/下一首" 意味着切歌并播放。
    // 但用户说 "控制开始阅读的位置"，可能意味着 "调整位置" 而非 "立即播放"。
    // 不过考虑到这是 TTS，如果正在读，切段通常期望继续读。
    // 如果没在读，切段只是移动光标。
    
    const wasSpeaking = isSpeaking;
    setActiveTtsParagraph(paragraphs[newIndex]);

    if (wasSpeaking) {
       // 如果之前在读，则继续读
        const startParagraphs = paragraphs.slice(newIndex);
        
        setTimeout(() => {
          if (ttsSessionRef.current !== sessionId) return;

          // 确保设置 isSpeaking 为 true，否则 speak 函数可能会因为状态不对而退出或者 UI 状态不对
          setIsSpeaking(true);

          if (ttsEngine === "browser") {
            speakWithBrowserParagraphs(startParagraphs, sessionId, newIndex);
          } else {
            speakWithLegadoParagraphs(startParagraphs, sessionId, newIndex);
          }
        }, 10);
    } else {
        // 如果之前没在读，就只停留在那里，高亮已经更新
        // 不需要做额外操作，只需要保证 session ID 变了阻止之前的逻辑即可
        // 但这里 activeTtsParagraph 是状态，可能会被之前的逻辑清空？
        // 不会，因为 session ID 变了。
    }
  }, [getReadableParagraphs, isSpeaking, ttsEngine, speakWithBrowserParagraphs, speakWithLegadoParagraphs]);

  const handleTtsNextParagraph = useCallback(() => {
    let paragraphs = allParagraphsRef.current;
    if (paragraphs.length === 0) {
      paragraphs = getReadableParagraphs();
      allParagraphsRef.current = paragraphs;
    }

    if (paragraphs.length === 0) return;

    const newIndex = Math.min(
      paragraphs.length - 1,
      currentParagraphIndexRef.current + 1
    );
    
    if (newIndex === currentParagraphIndexRef.current && currentParagraphIndexRef.current === paragraphs.length - 1) return;

    ttsSessionRef.current += 1;
    const sessionId = ttsSessionRef.current;
    
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
    }

    currentParagraphIndexRef.current = newIndex;
    
    const wasSpeaking = isSpeaking;
    setActiveTtsParagraph(paragraphs[newIndex]);

    if (wasSpeaking) {
        const startParagraphs = paragraphs.slice(newIndex);
        
        setTimeout(() => {
          if (ttsSessionRef.current !== sessionId) return;
          
          setIsSpeaking(true);

          if (ttsEngine === "browser") {
            speakWithBrowserParagraphs(startParagraphs, sessionId, newIndex);
          } else {
            speakWithLegadoParagraphs(startParagraphs, sessionId, newIndex);
          }
        }, 10);
    }
  }, [getReadableParagraphs, isSpeaking, ttsEngine, speakWithBrowserParagraphs, speakWithLegadoParagraphs]);

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
      epubReaderRef.current?.goToPercentage(newProgress);
    },
    []
  );

  const handlePrevPage = useCallback(() => {
    if (book?.format === "epub") {
      epubReaderRef.current?.scrollUp();
    } else if (book?.format === "txt") {
      txtReaderControllerRef.current?.scrollUp?.();
    } else if (book?.format === "pdf") {
      pdfReaderControllerRef.current?.prevPage();
    }
  }, [book?.format]);

  const handleNextPage = useCallback(() => {
    if (book?.format === "epub") {
      epubReaderRef.current?.scrollDown();
    } else if (book?.format === "txt") {
      txtReaderControllerRef.current?.scrollDown?.();
    } else if (book?.format === "pdf") {
      pdfReaderControllerRef.current?.nextPage();
    }
  }, [book?.format]);

  // ---- Background color based on theme ----
  const bgColors: Record<string, string> = {
    light: "bg-white",
    dark: "bg-[#1a1a2e]",
    sepia: "bg-[#f4ecd8]",
  };

  if (loading || !book || !bookUrl) {
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
      <div
        className="h-full w-full box-border"
        style={{
          paddingTop: 56,
          paddingBottom: 72,
        }}
      >
        {book.format === "epub" && (
          <EpubReader
            ref={epubReaderRef}
            url={bookUrl}
            initialLocation={initialLocation}
            fontSize={fontSize}
            theme={readerTheme}
            onLocationChange={handleLocationChange}
            onTocLoaded={handleTocLoaded}
            onTextSelected={handleTextSelected}
            onClick={isSpeaking ? undefined : handleToggleToolbar}
            highlights={highlights}
            activeTtsParagraph={activeTtsParagraph}
            ttsPlaybackProgress={ttsPlaybackProgress}
            ttsImmersiveMode={ttsImmersiveMode}
          />
        )}

        {book.format === "pdf" && (
          <div onClick={isSpeaking ? undefined : handleToggleToolbar}>
            <PdfReader
              url={bookUrl}
              initialPage={currentPage}
              onRegisterController={(controller) => {
                pdfReaderControllerRef.current = controller;
              }}
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
          <div
            className="h-full"
            onClick={isSpeaking ? undefined : handleToggleToolbar}
          >
            <TxtReader
              url={bookUrl}
              initialPage={currentPage}
              fontSize={fontSize}
              theme={readerTheme}
              activeTtsParagraph={activeTtsParagraph}
              ttsPlaybackProgress={ttsPlaybackProgress}
              ttsImmersiveMode={ttsImmersiveMode}
              onRegisterController={(controller) => {
                txtReaderControllerRef.current = controller;
              }}
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
        visible={toolbarVisible && !isSpeaking}
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
        onToggleTts={handleToggleTts}
        isSpeaking={isSpeaking}
        onToggleSettings={() => setSettingsOpen(true)}
        onProgressChange={handleProgressChange}
        onPrevPage={handlePrevPage}
        onNextPage={handleNextPage}
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
        ttsEngine={ttsEngine}
        onTtsEngineChange={setTtsEngine}
        browserVoices={browserVoices}
        selectedBrowserVoiceId={selectedBrowserVoiceId}
        onSelectedBrowserVoiceIdChange={setSelectedBrowserVoiceId}
        ttsRate={ttsRate}
        onTtsRateChange={setTtsRate}
        ttsPitch={ttsPitch}
        onTtsPitchChange={setTtsPitch}
        ttsVolume={ttsVolume}
        onTtsVolumeChange={setTtsVolume}
        microsoftPreloadCount={microsoftPreloadCount}
        onMicrosoftPreloadCountChange={setMicrosoftPreloadCount}
        legadoRate={legadoRate}
        onLegadoRateChange={setLegadoRate}
        legadoConfigs={legadoConfigs}
        selectedLegadoConfigId={selectedLegadoConfigId}
        onSelectedLegadoConfigIdChange={setSelectedLegadoConfigId}
        legadoImportText={legadoImportText}
        onLegadoImportTextChange={setLegadoImportText}
        onLegadoImport={handleLegadoImport}
        legadoImporting={legadoImporting}
        legadoPreloadCount={legadoPreloadCount}
        onLegadoPreloadCountChange={setLegadoPreloadCount}
        ttsImmersiveMode={ttsImmersiveMode}
        onTtsImmersiveModeChange={setTtsImmersiveMode}
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

      <TtsFloatingControl
        isSpeaking={isSpeaking}
        onToggle={handleToggleTts}
        onStop={stopSpeaking}
        onPrev={handleTtsPrevParagraph}
        onNext={handleTtsNextParagraph}
        ttsImmersiveMode={ttsImmersiveMode}
        onToggleImmersiveMode={() => setTtsImmersiveMode((prev) => !prev)}
        currentParagraphIndex={ttsCurrentIndex}
        totalParagraphs={ttsTotalParagraphs}
        paragraphProgress={ttsPlaybackProgress}
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
          <ReaderErrorBoundary>
            <ReaderContent />
          </ReaderErrorBoundary>
        </TooltipProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
