"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { SessionProvider, useSession } from "next-auth/react";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import dynamic from "next/dynamic";
import { ReaderErrorBoundary } from "@/components/reader/ReaderErrorBoundary";
import { ReaderToolbar } from "@/components/reader/ReaderToolbar";
import { SidePanel } from "@/components/reader/SidePanel";
import { ReadingSettings } from "@/components/reader/ReadingSettings";
import { FullscreenTtsView } from "@/components/reader/FullscreenTtsView";
import { TextSelectionMenu } from "@/components/reader/TextSelectionMenu";
import { NoteEditor } from "@/components/reader/NoteEditor";
import { TtsFloatingControl } from "@/components/reader/TtsFloatingControl";
import { READER_ROUTE_EXIT_EVENT } from "@/components/layout/ReaderRouteTransition";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import type { EpubReaderRef, ReaderParagraph } from "@/components/reader/EpubReader";
import type { Book, Bookmark, Note } from "@/lib/db/schema";
import type { BrowserVoiceOption } from "@/lib/tts";
import {
  cacheBook,
  getCachedBook,
} from "@/lib/book-cache";
import { ttsAudioCache, TtsAudioLruCache } from "@/lib/ttsAudioCache";
import { logger } from "@/lib/logger";
import { useProgressSyncCompat } from "@/hooks/useProgressSyncCompat";
import { useReaderSettingsStore, useDebouncedSettingsSave } from "@/stores/reader-settings";
import { READER_THEME_STYLES } from "@/lib/reader-theme";

// Dynamic import for EpubReader (client-only, depends on browser APIs)
const EpubReader = dynamic(() => import("@/components/reader/EpubReader"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  ),
});



const MAX_TTS_RETRY_COUNT = 5;
const TTS_RETRY_DELAY_MS = 450;
const IS_DEV = process.env.NODE_ENV !== "production";
const IDLE_TIMEOUT_MS = 3 * 60 * 1000;
const IDLE_WARNING_MS = 60 * 1000;

interface TocItem {
  label: string;
  href: string;
  id?: string;
  subitems?: TocItem[];
}

function normalizeTocHref(href?: string) {
  if (!href) return "";
  return href.split("#")[0]?.trim().toLowerCase() ?? "";
}

function buildMicrosoftTtsAudioUrl(params: {
  text: string;
  voiceName: string;
  rate: number;
  pitch: number;
  volume: number;
  prefetch?: boolean;
}) {
  const searchParams = new URLSearchParams({
    text: params.text,
    voiceName: params.voiceName,
    rate: String(params.rate),
    pitch: String(params.pitch),
    volume: String(params.volume),
  });

  if (params.prefetch) {
    searchParams.set("prefetch", "1");
  }

  return `/api/tts/microsoft?${searchParams.toString()}`;
}

function findCurrentChapterTitle(items: TocItem[], currentHref?: string): string | undefined {
  const targetHref = normalizeTocHref(currentHref);
  if (!targetHref) return undefined;

  for (const item of items) {
    const itemHref = normalizeTocHref(item.href);
    if (itemHref === targetHref || (itemHref && targetHref.startsWith(itemHref))) {
      return item.label;
    }

    if (item.subitems?.length) {
      const nestedMatch = findCurrentChapterTitle(item.subitems, currentHref);
      if (nestedMatch) return nestedMatch;
    }
  }

  return undefined;
}

function ReaderContent() {
  const router = useRouter();
  const params = useParams();
  const bookId = params.bookId as string;
  useSession();

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
  // Refs for saveProgress to read without adding state to useCallback deps
  const currentPageRef = useRef<number | undefined>(undefined);
  const totalPagesRef = useRef<number | undefined>(undefined);
  const [initialLocation, setInitialLocation] = useState<string | undefined>();

  // Settings from store
  const settings = useReaderSettingsStore();
  const fontSize = settings.fontSize;
  const pageWidth = settings.pageWidth;
  const readerTheme = settings.theme;
  const selectedBrowserVoiceId = settings.browserVoiceId;
  const ttsRate = settings.ttsRate;
  const microsoftPreloadCount = settings.microsoftPreloadCount;
  const ttsAutoNextChapter = settings.ttsAutoNextChapter;
  const ttsHighlightColor = settings.ttsHighlightColor;
  const ttsHighlightStyle = settings.ttsHighlightStyle;
  const autoScrollToActive = settings.autoScrollToActive;
  const debouncedSaveSettings = useDebouncedSettingsSave();

  // Local settings states (browser voices, TTS state)
  const [browserVoices, setBrowserVoices] = useState<BrowserVoiceOption[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isTtsViewOpen, setIsTtsViewOpen] = useState(false);
  const [ttsPlaybackProgress, setTtsPlaybackProgress] = useState(0);

  // Side panel
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"toc" | "bookmarks" | "notes">("toc");
  const [toc, setToc] = useState<TocItem[]>([]);
  const [currentHref, setCurrentHref] = useState<string | undefined>();

  // Settings panel
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Fullscreen
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  // Progress sync using compat hook
  const progressSync = useProgressSyncCompat(bookId);
  const currentLocationRef = progressSync.currentLocationRef;
  const progressRef = progressSync.progressRef;
  const saveProgress = progressSync.saveProgress;
  const debouncedSaveProgress = progressSync.debouncedSaveProgress;
  const _pendingSync = progressSync.pendingSync;
  const _isSyncing = progressSync.isSyncing;
  const accumulatedDuration = progressSync.accumulatedDuration;

  const currentCfiRef = useRef<string | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const ttsProgressRafRef = useRef<number | null>(null);

  const ttsSessionRef = useRef(0);
  const ttsResumeRef = useRef<(() => void) | null>(null);
  const [activeTtsParagraph, setActiveTtsParagraph] = useState("");
  const [activeTtsParagraphId, setActiveTtsParagraphId] = useState<string | null>(null);
  const [activeTtsLocation, setActiveTtsLocation] = useState<string | null>(null);
  const currentParagraphIndexRef = useRef(0);
  const allParagraphsRef = useRef<ReaderParagraph[]>([]);
  const readParagraphsHashRef = useRef<Set<string>>(new Set<string>());
  const ttsCurrentIndexRef = useRef(0);
  const ttsTotalParagraphsRef = useRef(0);

  // 跟踪 TTS 设置的上次值，用于检测设置变化
  const prevTtsSettingsRef = useRef({ rate: ttsRate, voiceId: selectedBrowserVoiceId });
  
  // Wake Lock for preventing screen sleep during TTS
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const mediaSessionSetupRef = useRef(false);

  // Idle timeout
  const [idleCountdown, setIdleCountdown] = useState<number | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleWarningRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentChapterTitle = useMemo(() => {
    return findCurrentChapterTitle(toc, currentHref) ?? book?.title;
  }, [book?.title, currentHref, toc]);

  const handleBackToReader = useCallback(() => {
    setIsTtsViewOpen(false);
  }, []);

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
        logger.error("reader", "加载书籍失败", error);
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

  // ---- Load settings from store ----
  useEffect(() => {
    settings.loadFromServer();
  }, []);

  // Auto-save settings when they change
  useEffect(() => {
    if (!settings.loaded) return;
    debouncedSaveSettings();
  }, [
    settings.fontSize,
    settings.pageWidth,
    settings.theme,
    settings.browserVoiceId,
    settings.ttsRate,
    settings.microsoftPreloadCount,
    settings.ttsAutoNextChapter,
    settings.ttsHighlightColor,
    settings.ttsHighlightStyle,
    settings.autoScrollToActive,
  ]);

  useEffect(() => {
    setTtsPlaybackProgress(0);
  }, [activeTtsParagraph]);

  const stopSpeaking = useCallback(() => {
    ttsSessionRef.current += 1;
    ttsResumeRef.current = null;
    allParagraphsRef.current = [];
    readParagraphsHashRef.current.clear();
    currentParagraphIndexRef.current = 0;
    ttsCurrentIndexRef.current = 0;
    ttsTotalParagraphsRef.current = 0;
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    if (ttsProgressRafRef.current !== null) {
      cancelAnimationFrame(ttsProgressRafRef.current);
      ttsProgressRafRef.current = null;
    }
    setActiveTtsParagraph("");
    setActiveTtsParagraphId(null);
    setActiveTtsLocation(null);
    setTtsPlaybackProgress(0);
    setIsSpeaking(false);
    setIsPaused(false);
    setIsTtsViewOpen(false);

    // Keep the reader on the currently spoken paragraph when stopping.
    if (book?.format === "epub" && autoScrollToActive) {
      epubReaderRef.current?.scrollToActiveParagraph();
    }

    // Release wake lock
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch((err) => {
        logger.warn("reader", "Failed to release wake lock", err);
      });
      wakeLockRef.current = null;
    }

    // Clear media session
    if ("mediaSession" in navigator && mediaSessionSetupRef.current) {
      navigator.mediaSession.playbackState = "none";
      mediaSessionSetupRef.current = false;
    }
  }, [autoScrollToActive, book?.format]);

  const setupMediaSession = useCallback(() => {
    if (!("mediaSession" in navigator)) return;
    if (mediaSessionSetupRef.current) return;
    
    mediaSessionSetupRef.current = true;
    
    navigator.mediaSession.metadata = new MediaMetadata({
      title: book?.title || "朗读中",
      artist: book?.author || "ZB Reader",
      album: "电子书朗读",
    });
    
    navigator.mediaSession.playbackState = "playing";
  }, [book]);

  const requestWakeLock = useCallback(async () => {
    if (!("wakeLock" in navigator)) return;
    
    try {
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
      }
      wakeLockRef.current = await navigator.wakeLock.request("screen");
    } catch {
      // Wake Lock not supported or failed
    }
  }, []);

  useEffect(() => {
    if (!settings.loaded) return;

    const loadVoices = async () => {
      try {
        const res = await fetch("/api/tts/microsoft/voices");
        if (!res.ok) return;
        const data = (await res.json()) as { voices?: BrowserVoiceOption[] };
        const mapped = data.voices || [];
        setBrowserVoices(mapped);
        const currentVoiceId = settings.browserVoiceId;
        if (mapped.length > 0) {
          if (currentVoiceId && mapped.some((voice) => voice.id === currentVoiceId)) {
            return;
          }
          settings.setBrowserVoiceId(mapped[0].id);
        }
      } catch {
        // ignore
      }
    };

    loadVoices();
  }, [settings.loaded]);

  // Progress saving is now handled by useProgressSyncCompat hook
  // Use saveProgress() and debouncedSaveProgress() from the hook

  // ---- Handlers ----
  const handleLocationChange = useCallback(
    (location: {
      cfi: string;
      progress: number;
      currentPage?: number;
      totalPages?: number;
      href?: string;
      scrollRatio?: number;
    }) => {
      // Encode the scroll ratio into the location string so we can restore the
      // exact scroll position (not just the chapter/CFI) on the next open.
      // Format: "<cfi>#scroll=<ratio>" where ratio is a float in [0, 1].
      // If scrollRatio is undefined (e.g. no scroll info), we strip any previous
      // suffix to keep the stored value clean.
      let locationToSave = location.cfi;
      if (typeof location.scrollRatio === "number" && location.scrollRatio > 0) {
        locationToSave = `${location.cfi}#scroll=${location.scrollRatio.toFixed(4)}`;
      }
      currentLocationRef.current = locationToSave;
      currentCfiRef.current = location.cfi;
      progressRef.current = location.progress;
      currentPageRef.current = location.currentPage;
      totalPagesRef.current = location.totalPages;
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

  const handleBack = useCallback(async () => {
    const saveResult = await saveProgress();
    if (!saveResult?.conflict) {
      const shouldSkipTransition =
        typeof window === "undefined" ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (!shouldSkipTransition && book) {
        window.dispatchEvent(
          new CustomEvent(READER_ROUTE_EXIT_EVENT, {
            detail: {
              href: "/bookshelf",
              bookId: book.id,
              title: book.title || "未命名书籍",
              author: book.author || "未知作者",
              coverUrl: book.cover ? `/api/books/${book.id}/cover` : undefined,
              hasCover: Boolean(book.cover),
              format: book.format,
              initial: book.title?.charAt(0) || "书",
              rect: {
                left: window.innerWidth / 2 - 120,
                top: window.innerHeight / 2 - 180,
                width: 240,
                height: 326,
              },
            },
          })
        );
      }

      window.setTimeout(
        () => {
          router.push("/bookshelf");
        },
        shouldSkipTransition ? 0 : 130
      );
    }
  }, [saveProgress, router, book]);

  // ---- Idle timeout: 5 minutes no activity -> return to bookshelf ----
  const _resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    if (idleWarningRef.current) {
      clearTimeout(idleWarningRef.current);
      idleWarningRef.current = null;
    }
    setIdleCountdown(null);

    // Warning: 1 minute before timeout
    idleWarningRef.current = setTimeout(() => {
      setIdleCountdown(60);
    }, IDLE_TIMEOUT_MS - IDLE_WARNING_MS);

    // Timeout: return to bookshelf
    idleTimerRef.current = setTimeout(() => {
      handleBack();
    }, IDLE_TIMEOUT_MS);
  }, [handleBack]);

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

  // ---- Fullscreen handlers ----
  const handleToggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
        // Lock orientation to portrait on mobile devices
        const orientation = screen.orientation as ScreenOrientation & { lock?: (type: string) => Promise<void> };
        if (orientation && typeof orientation.lock === "function") {
          try {
            await orientation.lock("portrait");
          } catch (err) {
            // Orientation lock not supported or failed, ignore
            logger.debug("reader", "屏幕方向锁定失败", err);
          }
        }
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
        // Unlock orientation when exiting fullscreen
        const orientation = screen.orientation as ScreenOrientation & { unlock?: () => void };
        if (orientation && typeof orientation.unlock === "function") {
          try {
            orientation.unlock();
          } catch (err) {
            // Orientation unlock not supported or failed, ignore
            logger.debug("reader", "屏幕方向解锁失败", err);
          }
        }
      }
    } catch (error) {
      logger.warn("reader", "全屏切换失败", error);
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isFullscreen);

      // Unlock orientation when exiting fullscreen
      if (!isFullscreen) {
        const orientation = screen.orientation as ScreenOrientation & { unlock?: () => void };
        if (orientation && typeof orientation.unlock === "function") {
          try {
            orientation.unlock();
          } catch (err) {
            // Orientation unlock not supported or failed, ignore
            logger.debug("reader", "屏幕方向解锁失败", err);
          }
        }
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // ---- Bookmark handlers ----
  const handleToggleBookmark = useCallback(async () => {
    const currentCfi = currentCfiRef.current;
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
    settings.setFontSize(size);
  }, [settings]);

  const handlePageWidthChange = useCallback((width: number) => {
    settings.setPageWidth(width);
  }, [settings]);

  const handleThemeChange = useCallback(async (theme: "light" | "dark" | "sepia") => {
    settings.setTheme(theme);
  }, [settings]);

  const handleSelectedBrowserVoiceIdChange = useCallback((voiceId: string) => {
    settings.setBrowserVoiceId(voiceId);
  }, [settings]);

  const requestMicrosoftSpeech = useCallback(
    async (text: string, options?: { prefetch?: boolean }) => {
      const ratePercent = Math.round((ttsRate - 1) * 100);

      // 检查缓存
      const cacheKey = TtsAudioLruCache.hashKey({
        engine: "microsoft",
        text,
        voiceName: selectedBrowserVoiceId,
        rate: ratePercent,
        pitch: 0,
        volume: 100,
      });
      const cached = ttsAudioCache.get(cacheKey);
      if (cached?.kind === "url" && !options?.prefetch) {
        return cached.audioUrl;
      }

      const audioUrl = buildMicrosoftTtsAudioUrl({
        text,
        voiceName: selectedBrowserVoiceId,
        rate: ratePercent,
        pitch: 0,
        volume: 100,
      });

      if (options?.prefetch) {
        const prefetchUrl = buildMicrosoftTtsAudioUrl({
          text,
          voiceName: selectedBrowserVoiceId,
          rate: ratePercent,
          pitch: 0,
          volume: 100,
          prefetch: true,
        });
        const res = await fetch(prefetchUrl, { method: "GET" });
        if (!res.ok && res.status !== 204) {
          const data = (await res.json().catch(() => null)) as
            | { error?: string; details?: string }
            | null;
          const message = data?.error || "朗读失败";
          const details = data?.details ? `: ${data.details}` : "";
          throw new Error(`${message}${details}`);
        }
      } else {
        // 使用稳定的同源 URL，避免移动端后台对 blob: 音频的兼容性问题
        ttsAudioCache.set(cacheKey, { kind: "url", audioUrl });
      }

      return audioUrl;
    },
    [selectedBrowserVoiceId, ttsRate]
  );

  const playAudioSource = useCallback(
    async (
      source: string,
      sessionId: number,
      options?: {
        onEnd?: () => void;
        onCleanup?: () => void;
        debugMeta?: { engine: "microsoft"; paragraphIndex?: number; paragraph?: string };
      }
    ) => {
      if (ttsSessionRef.current !== sessionId) return;

      if (source === "") {
        options?.onEnd?.();
        return;
      }

      // Setup Media Session for background playback on mobile
      setupMediaSession();
      
      // Request Wake Lock to prevent screen sleep
      void requestWakeLock();

      if (!currentAudioRef.current) {
        const audio = new Audio();
        audio.preload = "auto";
        audio.setAttribute("playsinline", "true");
        audio.setAttribute("webkit-playsinline", "true");
        currentAudioRef.current = audio;
      }

      const audio = currentAudioRef.current;

      const dispose = () => {
        audio.ontimeupdate = null;
        audio.onended = null;
        audio.onerror = null;
        audio.onpause = null;
        audio.onplay = null;
        audio.onloadedmetadata = null;
        audio.ondurationchange = null;
        audio.onprogress = null;
        audio.oncanplay = null;
        if (ttsProgressRafRef.current !== null) {
          cancelAnimationFrame(ttsProgressRafRef.current);
          ttsProgressRafRef.current = null;
        }
      };

      await new Promise<void>((resolve, reject) => {
        audio.pause();
        audio.currentTime = 0;
        audio.src = source;

        const getPlayableDuration = () => {
          if (Number.isFinite(audio.duration) && audio.duration > 0) {
            return audio.duration;
          }

          if (audio.seekable.length > 0) {
            const seekableEnd = audio.seekable.end(audio.seekable.length - 1);
            if (Number.isFinite(seekableEnd) && seekableEnd > 0) {
              return seekableEnd;
            }
          }

          if (audio.buffered.length > 0) {
            const bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
            if (Number.isFinite(bufferedEnd) && bufferedEnd > 0) {
              return bufferedEnd;
            }
          }

          return null;
        };

        const syncPlaybackProgress = () => {
          const duration = getPlayableDuration();
          if (!duration) return;

          const rawProgress = Math.min(1, Math.max(0, audio.currentTime / duration));
          const visibleProgress =
            rawProgress > 0 && rawProgress < 0.012 ? 0.012 : rawProgress;

          setTtsPlaybackProgress(
            visibleProgress
          );
        };

        const startProgressLoop = () => {
          if (ttsProgressRafRef.current !== null) {
            cancelAnimationFrame(ttsProgressRafRef.current);
          }

          const tick = () => {
            syncPlaybackProgress();

            if (!audio.paused && !audio.ended) {
              ttsProgressRafRef.current = requestAnimationFrame(tick);
            } else {
              ttsProgressRafRef.current = null;
            }
          };

          ttsProgressRafRef.current = requestAnimationFrame(tick);
        };

        audio.onplay = () => {
          syncPlaybackProgress();
          startProgressLoop();
        };

        audio.onpause = () => {
          syncPlaybackProgress();
          if (ttsProgressRafRef.current !== null) {
            cancelAnimationFrame(ttsProgressRafRef.current);
            ttsProgressRafRef.current = null;
          }
        };

        audio.onloadedmetadata = syncPlaybackProgress;
        audio.ondurationchange = syncPlaybackProgress;
        audio.onprogress = syncPlaybackProgress;
        audio.oncanplay = syncPlaybackProgress;

        audio.onended = () => {
          syncPlaybackProgress();
          dispose();
          setTtsPlaybackProgress(1);
          options?.onEnd?.();
          resolve();
        };

        audio.onerror = () => {
          dispose();
          options?.onCleanup?.();
          if (IS_DEV) {
            logger.warn("tts", "audio element onerror", options?.debugMeta);
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
            logger.warn("tts", "audio.play rejected", {
              ...options?.debugMeta,
              reason,
            });
          }

          reject(new Error(`audio_play_error:${reason}`));
        });
      });
    },
    [setupMediaSession, requestWakeLock]
  );

  const replayCurrentTtsParagraph = useCallback(async () => {
    if (!activeTtsParagraph) return;

    const currentIndex = currentParagraphIndexRef.current;
    const shouldResumePlayback = isSpeaking && !isPaused;

    ttsSessionRef.current += 1;
    const sessionId = ttsSessionRef.current;
    ttsResumeRef.current = null;

    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
    }

    setTtsPlaybackProgress(0);

    if (!shouldResumePlayback) {
      setIsSpeaking(true);
      setIsPaused(true);
      return;
    }

    try {
      const objectUrl = await requestMicrosoftSpeech(activeTtsParagraph);
      if (ttsSessionRef.current !== sessionId) {
        return;
      }

      await playAudioSource(objectUrl, sessionId, {
        debugMeta: { engine: "microsoft", paragraphIndex: currentIndex },
      });
    } catch {
      // 忽略设置切换导致的重播错误，保持当前会话可继续操作
    }
  }, [activeTtsParagraph, isPaused, isSpeaking, playAudioSource, requestMicrosoftSpeech]);

  // 当 TTS 设置变化时，如果正在播放，重新播放当前段落
  useEffect(() => {
    const prev = prevTtsSettingsRef.current;
    const current = { rate: ttsRate, voiceId: selectedBrowserVoiceId };

    const hasChanged = prev.rate !== current.rate || prev.voiceId !== current.voiceId;

    prevTtsSettingsRef.current = current;

    if (!hasChanged || !isSpeaking || !activeTtsParagraph) {
      return;
    }

    if (isPaused) {
      setTtsPlaybackProgress(0);
      return;
    }

    void replayCurrentTtsParagraph();
  }, [activeTtsParagraph, isPaused, isSpeaking, replayCurrentTtsParagraph, selectedBrowserVoiceId, ttsRate]);

  const speakWithBrowserParagraphs = useCallback(
    async (paragraphs: ReaderParagraph[], sessionId: number, startIndex = 0) => {
      const queue = paragraphs.filter((item) => item.text.trim().length > 0);
      if (queue.length === 0) {
        toast.error("当前页面没有可朗读段落");
        return;
      }

      setIsSpeaking(true);

      const preparedTaskMap = new Map<number, Promise<string>>();
      const preloadWindowSize = Math.max(microsoftPreloadCount, 5);

      const ensurePreloadWindow = (windowStart: number) => {
        for (
          let cursor = windowStart;
          cursor < Math.min(queue.length, windowStart + preloadWindowSize);
          cursor += 1
        ) {
          if (!preparedTaskMap.has(cursor)) {
            const task = requestMicrosoftSpeech(queue[cursor].text, { prefetch: true });
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
        ttsCurrentIndexRef.current = startIndex + i;
        const paragraph = queue[i];
        setActiveTtsParagraph(paragraph.text);
        setActiveTtsParagraphId(paragraph.id);
        setActiveTtsLocation(paragraph.location ?? null);

        // 跳过已读的段落（避免跨页重复朗读）
        const hash = paragraph.location || paragraph.text.slice(0, 50);
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
                ? preparedTaskMap.get(i) ?? requestMicrosoftSpeech(paragraph.text)
                : requestMicrosoftSpeech(paragraph.text)
            );

            await new Promise<void>((resolve, reject) => {
              if (ttsSessionRef.current !== sessionId) {
                resolve();
                return;
              }

              void playAudioSource(objectUrl as string, sessionId, {
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
            if (currentAudioRef.current) {
              currentAudioRef.current.pause();
              currentAudioRef.current.currentTime = 0;
            }

            const canRetry = isRetryableTtsError(error);

            if (attempt < MAX_TTS_RETRY_COUNT && canRetry) {
              if (ttsSessionRef.current === sessionId) {
                toast(`朗读失败，正在重试（${attempt + 1}/${MAX_TTS_RETRY_COUNT}）`);
              }
              await wait(TTS_RETRY_DELAY_MS);
              continue;
            }

            break;
          }
        }

        if (!paragraphSucceeded) {
          if (ttsSessionRef.current === sessionId) {
            setActiveTtsParagraph("");
            setActiveTtsParagraphId(null);
            setActiveTtsLocation(null);
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
        task.catch(() => {
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

  const getReadableParagraphs = useCallback(() => {
    if (!book) return [] as ReaderParagraph[];

    if (book.format === "epub") {
      const paragraphs = epubReaderRef.current?.getCurrentParagraphs?.() || [];
      return paragraphs;
    }

    return [] as ReaderParagraph[];
  }, [book]);

  /**
   * 获取朗读起始段落的索引：找到当前视口内第一个可见段落在段落列表中的位置。
   * - EPUB：getCurrentParagraphs 已经只返回视口内段落，始终从 0 开始
   * - PDF/其他：始终从 0 开始
   */
  const getInitialParagraphIndex = useCallback((paragraphs: ReaderParagraph[]): number => {
    if (!book || paragraphs.length === 0) return 0;

    if (book.format === "epub") {
      // EPUB 已经只返回视口内段落，始终从头开始
      return 0;
    }

    // PDF 及其他格式从头开始
    return 0;
  }, [book]);

  const getPageIdentity = useCallback(() => {
    if (!book) return "";

    if (book.format === "epub") {
      // Use pure CFI (without scroll suffix) so TTS page-change detection
      // only triggers on actual chapter/section navigation, not scroll movement.
      return currentCfiRef.current || "";
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

        await new Promise((resolve) => setTimeout(resolve, 120));
      }
      return false;
    },
    [getPageIdentity]
  );

  const tryAutoTurnPage = useCallback(
    async (sessionId: number): Promise<boolean> => {
      if (!book || !ttsAutoNextChapter) return false;

      const previousIdentity = getPageIdentity();
      const _previousHref = currentHref;

      if (book.format === "epub") {
        // 在 scrolled-doc 模式下，每次只显示一个章节
        // 需要检测当前是否在章节末尾，然后调用 rendition.next()
        const epubInstance = epubReaderRef.current;
        if (!epubInstance) return false;
        
        const progress = epubInstance.getProgress();
        const _currentLocation = epubInstance.getCurrentLocation();
        
        // 如果已到整本书的末尾
        if (progress >= 0.995) {
          return false;
        }
        
        // 检查当前视口是否已经滚动到底部
        const epubContainer = document.querySelector("#epub-viewer .epub-container") as HTMLElement | null;
        if (epubContainer) {
          const scrollBottom = epubContainer.scrollHeight - epubContainer.scrollTop - epubContainer.clientHeight;
          const isNearBottom = scrollBottom < 50;
          
          if (isNearBottom) {
            // 已在当前章节底部，调用 next() 进入下一章节
            epubInstance.nextPage();
          } else {
            // 还在章节中间，继续向下滚动
            epubInstance.scrollDown();
          }
        } else {
          epubInstance.scrollDown();
        }
      } else {
        return false;
      }

      return waitForPageChange(previousIdentity, sessionId);
    },
    [book, currentPage, currentHref, getPageIdentity, totalPages, ttsAutoNextChapter, waitForPageChange]
  );

  const handlePauseTts = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
    }
    setIsPaused(true);

    if ("mediaSession" in navigator && mediaSessionSetupRef.current) {
      navigator.mediaSession.playbackState = "paused";
    }
  }, []);

  const handleResumeTts = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.play().catch((err) => {
        logger.warn("tts", "Failed to resume audio", err);
      });
    }
    setIsPaused(false);
    setIsTtsViewOpen(true);

    if ("mediaSession" in navigator && mediaSessionSetupRef.current) {
      navigator.mediaSession.playbackState = "playing";
    }
  }, []);

  const handleToggleTts = useCallback(async () => {
    if (isSpeaking) {
      if (isPaused) {
        handleResumeTts();
      } else {
        handlePauseTts();
      }
      return;
    }

    if (ttsResumeRef.current) {
      setIsTtsViewOpen(true);
      setIsSpeaking(true);
      const resume = ttsResumeRef.current;
      ttsResumeRef.current = null;
      resume();
      return;
    }

    ttsSessionRef.current += 1;
    readParagraphsHashRef.current.clear();
    const sessionId = ttsSessionRef.current;

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
    ttsTotalParagraphsRef.current = paragraphs.length;

    currentParagraphIndexRef.current = getInitialParagraphIndex(paragraphs);
    ttsCurrentIndexRef.current = currentParagraphIndexRef.current;

    setIsTtsViewOpen(true);
    setToolbarVisible(false);
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
          ttsCurrentIndexRef.current = 0;
          allParagraphsRef.current = paragraphs;
          ttsTotalParagraphsRef.current = paragraphs.length;
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

      try {
        await speakWithBrowserParagraphs(paragraphsToRead, sessionId, startIndex);
        // 朗读成功后，记录这些段落的哈希
        paragraphsToRead.forEach(p => {
          readParagraphsHashRef.current.add(p.location || p.text.slice(0, 50));
        });
      } catch {
        break;
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
      setActiveTtsParagraphId(null);
      setActiveTtsLocation(null);
      setIsSpeaking(false);
      setIsTtsViewOpen(false);
    }
  }, [
    book,
    getInitialParagraphIndex,
    getReadableParagraphs,
    handlePauseTts,
    handleResumeTts,
    isPaused,
    isSpeaking,
    speakWithBrowserParagraphs,
    stopSpeaking,
    tryAutoTurnPage,
  ]);

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, [stopSpeaking]);

  const handleTtsPrevParagraph = useCallback(() => {
    let paragraphs = allParagraphsRef.current;
    if (paragraphs.length === 0) {
      paragraphs = getReadableParagraphs();
      allParagraphsRef.current = paragraphs;
    }

    if (paragraphs.length === 0) return;

    const newIndex = Math.max(0, currentParagraphIndexRef.current - 1);

    if (newIndex === currentParagraphIndexRef.current && currentParagraphIndexRef.current === 0) return;

    const shouldResumePlayback = isSpeaking && !isPaused;

    ttsSessionRef.current += 1;
    const sessionId = ttsSessionRef.current;
    ttsResumeRef.current = null;

    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
    }

    currentParagraphIndexRef.current = newIndex;
    ttsCurrentIndexRef.current = newIndex;
    setActiveTtsParagraph(paragraphs[newIndex].text);
    setActiveTtsParagraphId(paragraphs[newIndex].id);
    setActiveTtsLocation(paragraphs[newIndex].location ?? null);
    setTtsPlaybackProgress(0);

    if (!shouldResumePlayback) {
      setIsSpeaking(true);
      setIsPaused(true);
      return;
    }

    const startParagraphs = paragraphs.slice(newIndex);
    setTimeout(() => {
      if (ttsSessionRef.current !== sessionId) return;
      setIsSpeaking(true);
      setIsPaused(false);
      void speakWithBrowserParagraphs(startParagraphs, sessionId, newIndex);
    }, 10);
  }, [getReadableParagraphs, isPaused, isSpeaking, speakWithBrowserParagraphs]);

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

    const shouldResumePlayback = isSpeaking && !isPaused;

    ttsSessionRef.current += 1;
    const sessionId = ttsSessionRef.current;
    ttsResumeRef.current = null;

    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
    }

    currentParagraphIndexRef.current = newIndex;
    ttsCurrentIndexRef.current = newIndex;
    setActiveTtsParagraph(paragraphs[newIndex].text);
    setActiveTtsParagraphId(paragraphs[newIndex].id);
    setActiveTtsLocation(paragraphs[newIndex].location ?? null);
    setTtsPlaybackProgress(0);

    if (!shouldResumePlayback) {
      setIsSpeaking(true);
      setIsPaused(true);
      return;
    }

    const startParagraphs = paragraphs.slice(newIndex);
    setTimeout(() => {
      if (ttsSessionRef.current !== sessionId) return;
      setIsSpeaking(true);
      setIsPaused(false);
      void speakWithBrowserParagraphs(startParagraphs, sessionId, newIndex);
    }, 10);
  }, [getReadableParagraphs, isPaused, isSpeaking, speakWithBrowserParagraphs]);

  // Setup Media Session action handlers
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    
    navigator.mediaSession.setActionHandler("play", () => {
      if (!isSpeaking && ttsResumeRef.current) {
        setIsSpeaking(true);
        ttsResumeRef.current();
        ttsResumeRef.current = null;
      }
      navigator.mediaSession.playbackState = "playing";
    });
    
    navigator.mediaSession.setActionHandler("pause", () => {
      if (isSpeaking && !isPaused) {
        handlePauseTts();
      }
      navigator.mediaSession.playbackState = "paused";
    });
    
    navigator.mediaSession.setActionHandler("stop", () => {
      stopSpeaking();
    });
    
    navigator.mediaSession.setActionHandler("previoustrack", () => {
      handleTtsPrevParagraph();
    });
    
    navigator.mediaSession.setActionHandler("nexttrack", () => {
      handleTtsNextParagraph();
    });
    
    return () => {
      navigator.mediaSession.setActionHandler("play", null);
      navigator.mediaSession.setActionHandler("pause", null);
      navigator.mediaSession.setActionHandler("stop", null);
      navigator.mediaSession.setActionHandler("previoustrack", null);
      navigator.mediaSession.setActionHandler("nexttrack", null);
    };
  }, [handlePauseTts, handleTtsNextParagraph, handleTtsPrevParagraph, isPaused, isSpeaking, stopSpeaking]);

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
    }
  }, [book?.format]);

  const handleNextPage = useCallback(() => {
    if (book?.format === "epub") {
      epubReaderRef.current?.scrollDown();
    }
  }, [book?.format]);

  const handlePrevChapter = useCallback(() => {
    if (book?.format !== "epub") return;
    
    // 方法 1：使用 rendition.prev() - scrolled-doc 模式下切换到上一节
    const epubInstance = epubReaderRef.current;
    if (epubInstance) {
      epubInstance.prevPage();
      return;
    }
    
    // 方法 2：使用 TOC 导航（备用）
    if (toc.length === 0) return;
    
    let currentIndex = -1;
    if (currentHref) {
      currentIndex = toc.findIndex(
        (item) => item.href === currentHref || item.href.includes(currentHref)
      );
    }
    
    if (currentIndex === -1) {
      const currentProgress = progressRef.current;
      currentIndex = Math.floor(currentProgress * toc.length) - 1;
      currentIndex = Math.max(0, currentIndex);
    }
    
    if (currentIndex > 0) {
      const prevChapter = toc[currentIndex - 1];
      epubReaderRef.current?.goToHref(prevChapter.href);
    }
  }, [book?.format, currentHref, toc]);

  const handleNextChapter = useCallback(() => {
    if (book?.format !== "epub") return;
    
    // 方法 1：使用 rendition.next() - scrolled-doc 模式下切换到下一节
    const epubInstance = epubReaderRef.current;
    if (epubInstance) {
      epubInstance.nextPage();
      return;
    }
    
    // 方法 2：使用 TOC 导航（备用）
    if (toc.length === 0) return;
    
    let currentIndex = -1;
    if (currentHref) {
      currentIndex = toc.findIndex(
        (item) => item.href === currentHref || item.href.includes(currentHref)
      );
    }
    
    if (currentIndex === -1) {
      const currentProgress = progressRef.current;
      currentIndex = Math.floor(currentProgress * toc.length);
    }
    
    if (currentIndex !== -1 && currentIndex < toc.length - 1) {
      const nextChapter = toc[currentIndex + 1];
      epubReaderRef.current?.goToHref(nextChapter.href);
    }
  }, [book?.format, currentHref, toc]);

  // 计算是否有上一章/下一章
  // 使用 TOC（目录）来判断章节边界
  let hasPrevChapter = false;
  let hasNextChapter = false;
  
  if (book?.format === "epub" && toc.length > 0) {
    // 找到当前章节在 TOC 中的索引
    const currentIdx = toc.findIndex(item => 
      item.href === currentHref || 
      currentHref?.includes(item.href) ||
      item.href?.includes(currentHref || '')
    );
    
    if (currentIdx !== -1) {
      hasPrevChapter = currentIdx > 0;
      hasNextChapter = currentIdx < toc.length - 1;
    } else {
      // 如果在 TOC 中找不到，但有 currentHref，说明可能在子章节
      // 这种情况下假设可以前后翻页
      hasPrevChapter = true;
      hasNextChapter = true;
    }
  }

  const _handleJumpToReading = useCallback(() => {
    if (book?.format === "epub") {
      epubReaderRef.current?.scrollToActiveParagraph();
    }
  }, [book?.format]);

  const handleOpenTtsView = useCallback(() => {
    setIsTtsViewOpen(true);
    setToolbarVisible(false);
  }, []);

  // ---- Theme styles ----
  const currentTheme = READER_THEME_STYLES[readerTheme] || READER_THEME_STYLES.light;
  // Apply CSS variables to root for Portal access
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--reader-bg", currentTheme.solidBg);
    root.style.setProperty("--reader-card-bg", currentTheme.cardBg);
    root.style.setProperty("--reader-text", currentTheme.text);
    root.style.setProperty("--reader-muted-text", currentTheme.mutedText);
    root.style.setProperty("--reader-border", currentTheme.border);
    root.style.setProperty("--reader-shadow", currentTheme.shadow);
    root.style.setProperty("--reader-primary", currentTheme.primary);
    root.style.setProperty("--reader-primary-light", currentTheme.primaryLight);
    root.style.setProperty("--reader-destructive", currentTheme.destructive);
  }, [readerTheme]);

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
    <div
      className={`isolate h-screen w-screen overflow-hidden ${currentTheme.bg}`}
      data-reader-theme={readerTheme}
      style={{
        "--reader-bg": currentTheme.solidBg,
        "--reader-card-bg": currentTheme.cardBg,
        "--reader-text": currentTheme.text,
        "--reader-muted-text": currentTheme.mutedText,
        "--reader-border": currentTheme.border,
        "--reader-shadow": currentTheme.shadow,
        "--reader-primary": currentTheme.primary,
        "--reader-primary-light": currentTheme.primaryLight,
        "--reader-destructive": currentTheme.destructive,
      } as React.CSSProperties}
    >
      <div className="relative h-full w-full">
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 16% 18%, color-mix(in srgb, white 18%, transparent) 0%, transparent 18%), radial-gradient(circle at 84% 14%, color-mix(in srgb, var(--reader-text) 4%, transparent) 0%, transparent 18%), linear-gradient(180deg, color-mix(in srgb, var(--reader-bg) 94%, white 6%) 0%, var(--reader-bg) 34%, color-mix(in srgb, var(--reader-bg) 97%, var(--reader-text) 3%) 100%)",
            }}
          />
          <div
            className="absolute inset-x-0 top-0 h-24"
            style={{
              background:
                "linear-gradient(180deg, color-mix(in srgb, var(--reader-primary) 3%, transparent) 0%, transparent 100%)",
            }}
          />
          <div
            className="absolute inset-x-0 bottom-0 h-48"
            style={{
              background:
                "linear-gradient(180deg, transparent 0%, color-mix(in srgb, var(--reader-text) 4%, transparent) 100%)",
            }}
          />
        </div>

        <div className="relative h-full w-full px-3 py-3 sm:px-4 sm:py-4 lg:px-6">
          <div
            className="animate-reader-fade-up relative mx-auto h-full max-w-[1520px] overflow-hidden"
            style={{ animationDelay: "40ms" }}
          >
            {!isSpeaking && !isTtsViewOpen ? (
              <div
                className="pointer-events-none absolute left-1/2 top-2 z-10 hidden -translate-x-1/2 animate-reader-fade-up lg:flex"
                style={{ animationDelay: "90ms" }}
              >
                <div
                  className="animate-reader-surface relative inline-flex min-w-[22rem] max-w-[36rem] items-center gap-3 overflow-hidden rounded-full border px-3 py-2 backdrop-blur-xl"
                  style={{
                    background:
                      "color-mix(in srgb, var(--reader-card-bg) 70%, transparent)",
                    borderColor:
                      "color-mix(in srgb, var(--reader-text) 6%, transparent)",
                    boxShadow:
                      "0 8px 22px -18px color-mix(in srgb, var(--reader-text) 16%, transparent)",
                  }}
                >
                  <div
                    className="pointer-events-none absolute bottom-0 left-0 h-px rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.max(0, progress * 100))}%`,
                      background:
                        "linear-gradient(90deg, color-mix(in srgb, var(--reader-primary) 12%, transparent) 0%, color-mix(in srgb, var(--reader-primary) 36%, transparent) 100%)",
                    }}
                  />
                  <div className="min-w-0 flex-1 px-0.5">
                    <div
                      className="truncate text-[10px] font-medium tracking-[0.12em]"
                      style={{ color: "var(--reader-muted-text)" }}
                    >
                      {book.title}
                    </div>
                    <div
                      className="mt-0.5 truncate text-[13px] font-semibold"
                      style={{ color: "var(--reader-text)" }}
                    >
                      {currentChapterTitle || book.title}
                    </div>
                  </div>
                  <span
                    className="shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold"
                    style={{
                      background:
                        "color-mix(in srgb, var(--reader-primary) 5%, transparent)",
                      borderColor:
                        "color-mix(in srgb, var(--reader-primary) 10%, transparent)",
                      color: "var(--reader-primary)",
                    }}
                  >
                    {(progress * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            ) : null}

            {/* Reader content area */}
            <div
              className="animate-reader-fade-up relative h-full w-full box-border"
              style={{
                paddingTop: isTtsViewOpen ? 0 : 56,
                paddingBottom: isTtsViewOpen ? 0 : 72,
                animationDelay: "120ms",
              }}
            >
              {book.format === "epub" && (
                <EpubReader
                  key={bookId}
                  ref={epubReaderRef}
                  url={bookUrl}
                  initialLocation={initialLocation}
                  fontSize={fontSize}
                  pageWidth={pageWidth}
                  theme={readerTheme}
                  onLocationChange={handleLocationChange}
                  onTocLoaded={handleTocLoaded}
                  onTextSelected={handleTextSelected}
                  onClick={isSpeaking ? undefined : handleToggleToolbar}
                  highlights={highlights}
                  activeTtsParagraph={activeTtsParagraph}
                  activeTtsParagraphId={activeTtsParagraphId}
                  activeTtsLocation={activeTtsLocation}
                  ttsPlaybackProgress={ttsPlaybackProgress}
                  ttsHighlightColor={ttsHighlightColor}
                  ttsHighlightStyle={ttsHighlightStyle}
                  autoScrollToActive={autoScrollToActive}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <ReaderToolbar
        visible={toolbarVisible && !isSpeaking && !isTtsViewOpen}
        title={book.title}
        currentChapterTitle={currentChapterTitle}
        currentPage={currentPage}
        totalPages={totalPages}
        progress={progress}
        readingDuration={accumulatedDuration}
        isBookmarked={isCurrentBookmarked}
        isFullscreen={isFullscreen}
        onBack={handleBack}
        onToggleToc={() => {
          setSidePanelOpen(true);
          setActiveTab("toc");
        }}
        onToggleBookmark={handleToggleBookmark}
        onToggleTts={handleToggleTts}
        onToggleFullscreen={handleToggleFullscreen}
        onToggleSettings={() => setSettingsOpen(true)}
        isSpeaking={isSpeaking}
        onProgressChange={handleProgressChange}
        onPrevPage={handlePrevPage}
        onNextPage={handleNextPage}
        onPrevChapter={handlePrevChapter}
        onNextChapter={handleNextChapter}
        hasPrevChapter={hasPrevChapter}
        hasNextChapter={hasNextChapter}
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
        pageWidth={pageWidth}
        onPageWidthChange={handlePageWidthChange}
        theme={readerTheme}
        onThemeChange={handleThemeChange}
        browserVoices={browserVoices}
        selectedBrowserVoiceId={selectedBrowserVoiceId}
        onSelectedBrowserVoiceIdChange={handleSelectedBrowserVoiceIdChange}
        ttsRate={ttsRate}
        onTtsRateChange={settings.setTtsRate}
        microsoftPreloadCount={microsoftPreloadCount}
        onMicrosoftPreloadCountChange={settings.setMicrosoftPreloadCount}
        ttsAutoNextChapter={ttsAutoNextChapter}
        onTtsAutoNextChapterChange={settings.setTtsAutoNextChapter}
        ttsHighlightColor={ttsHighlightColor}
        onTtsHighlightColorChange={settings.setTtsHighlightColor}
        ttsHighlightStyle={ttsHighlightStyle}
        onTtsHighlightStyleChange={settings.setTtsHighlightStyle}
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

      {book && (
        <FullscreenTtsView
          open={isTtsViewOpen}
          book={book}
          currentChapterTitle={currentChapterTitle}
          activeParagraph={activeTtsParagraph}
          isSpeaking={isSpeaking}
          isPaused={isPaused}
          ttsPlaybackProgress={ttsPlaybackProgress}
          progress={progress}
          readingDuration={accumulatedDuration}
          ttsRate={ttsRate}
          selectedBrowserVoiceId={selectedBrowserVoiceId}
          browserVoices={browserVoices}
          ttsAutoNextChapter={ttsAutoNextChapter}
          autoScrollToActive={autoScrollToActive}
          isFullscreen={isFullscreen}
          onBackToReader={handleBackToReader}
          onToggle={handleToggleTts}
          onStop={stopSpeaking}
          onPrev={handleTtsPrevParagraph}
          onNext={handleTtsNextParagraph}
          onSelectedBrowserVoiceIdChange={handleSelectedBrowserVoiceIdChange}
          onTtsRateChange={settings.setTtsRate}
          onToggleAutoNextChapter={settings.setTtsAutoNextChapter}
          onToggleAutoScrollToActive={settings.setAutoScrollToActive}
          onToggleFullscreen={handleToggleFullscreen}
        />
      )}

      <TtsFloatingControl
        hidden={isTtsViewOpen}
        isSpeaking={isSpeaking}
        isPaused={isPaused}
        onToggle={handleToggleTts}
        onStop={stopSpeaking}
        onPrev={handleTtsPrevParagraph}
        onNext={handleTtsNextParagraph}
        onOpenImmersiveView={handleOpenTtsView}
        ttsAutoNextChapter={ttsAutoNextChapter}
        onTtsAutoNextChapterChange={settings.setTtsAutoNextChapter}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        autoScrollToActive={autoScrollToActive}
        onAutoScrollToActiveChange={settings.setAutoScrollToActive}
        progress={progress}
      />

      {/* Idle countdown warning */}
      {idleCountdown !== null && idleCountdown > 0 && (
        <div
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full shadow-lg animate-pulse"
          style={{
            background: "var(--reader-card-bg)",
            border: "1px solid var(--reader-border)",
            color: "var(--reader-text)",
          }}
        >
          <span className="text-sm font-medium">
            即将返回书架 ({idleCountdown}秒)
          </span>
        </div>
      )}

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
