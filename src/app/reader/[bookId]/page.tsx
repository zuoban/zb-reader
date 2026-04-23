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
import {
  useIdleTimeout,
  useBookmarkActions,
  useNoteActions,
  useReaderBookData,
  useReaderFullscreen,
  useReaderNavigation,
  useReaderSettingsLifecycle,
  useReaderTtsAudio,
  useReaderTtsSession,
} from "@/components/reader/hooks";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import type { EpubReaderRef } from "@/components/reader/EpubReader";
import type { TocItem } from "@/types/reader";
import { ttsAudioCache, TtsAudioLruCache } from "@/lib/ttsAudioCache";
import { useProgressSyncCompat } from "@/hooks/useProgressSyncCompat";
import { useReaderSettingsStore, useDebouncedSettingsSave } from "@/stores/reader-settings";
import type { FontFamily } from "@/stores/reader-settings";
import type { Sentence } from "@/lib/textUtils";

// Dynamic import for EpubReader (client-only, depends on browser APIs)
const EpubReader = dynamic(() => import("@/components/reader/EpubReader"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  ),
});



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

  // Reader state
  const [toolbarVisible, setToolbarVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentPage, setCurrentPage] = useState<number | undefined>();
  const [totalPages, setTotalPages] = useState<number | undefined>();
  // Refs for saveProgress to read without adding state to useCallback deps
  const currentPageRef = useRef<number | undefined>(undefined);
  const totalPagesRef = useRef<number | undefined>(undefined);

  // Settings from store
  const settings = useReaderSettingsStore();
  const fontSize = settings.fontSize;
  const fontFamily = settings.fontFamily;
  const readerTheme = settings.theme;
  const selectedBrowserVoiceId = settings.browserVoiceId;
  const ttsRate = settings.ttsRate;
  const microsoftPreloadCount = settings.microsoftPreloadCount;
  const ttsAutoNextChapter = settings.ttsAutoNextChapter;
  const ttsHighlightColor = settings.ttsHighlightColor;
  const debouncedSaveSettings = useDebouncedSettingsSave();

  // Local TTS state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isTtsViewOpen, setIsTtsViewOpen] = useState(false);

  // Side panel
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"toc" | "bookmarks" | "notes">("toc");
  const [toc, setToc] = useState<TocItem[]>([]);
  const [currentHref, setCurrentHref] = useState<string | undefined>();

  // Settings panel
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Fullscreen
  const { isFullscreen, toggleFullscreen: handleToggleFullscreen } = useReaderFullscreen();

  const [isCurrentBookmarked, setIsCurrentBookmarked] = useState(false);

  const handleMissingBook = useCallback(() => {
    router.push("/bookshelf");
  }, [router]);

  const handleProgressLoaded = useCallback((loadedProgress: number) => {
    setProgress(loadedProgress);
  }, []);

  const {
    book,
    loading,
    bookUrl,
    initialLocation,
    bookmarks,
    setBookmarks,
    notes,
    setNotes,
    highlights,
    setHighlights,
  } = useReaderBookData({
    bookId,
    onMissingBook: handleMissingBook,
    onProgressLoaded: handleProgressLoaded,
  });

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

  const currentCfiRef = useRef<string | null>(null);

  const ttsSessionRef = useRef(0);
  const [activeTtsParagraph, setActiveTtsParagraph] = useState("");
  const [activeTtsParagraphId, setActiveTtsParagraphId] = useState<string | null>(null);
  const [activeTtsLocation, setActiveTtsLocation] = useState<string | null>(null);
  const currentParagraphIndexRef = useRef(0);
  const allSentencesRef = useRef<Sentence[]>([]);
  const readSentencesHashRef = useRef<Set<string>>(new Set<string>());
  const ttsCurrentIndexRef = useRef(0);
  const ttsTotalSentencesRef = useRef(0);
  const handleBackRef = useRef<(() => Promise<void>) | null>(null);

  const currentChapterTitle = useMemo(() => {
    return findCurrentChapterTitle(toc, currentHref) ?? book?.title;
  }, [book?.title, currentHref, toc]);

  const { browserVoices, currentTheme } = useReaderSettingsLifecycle(
    settings,
    debouncedSaveSettings
  );

  const handleBackToReader = useCallback(() => {
    setIsTtsViewOpen(false);
  }, []);

  // Progress saving is now handled by useProgressSyncCompat hook
  // Use saveProgress() and debouncedSaveProgress() from the hook

  // ---- Handlers ----
  const {
    handleLocationChange,
    handleTocLoaded,
    handleTextSelected,
    handleToggleToolbar,
    handleBack,
    handleTocItemClick,
    handleBookmarkClick,
    handleNoteClick,
    handleProgressChange,
    handlePrevPage,
    handleNextPage,
    handlePrevChapter,
    handleNextChapter,
    hasPrevChapter,
    hasNextChapter,
  } = useReaderNavigation({
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
    currentPageRef,
    totalPagesRef,
    bookmarks,
    setIsCurrentBookmarked,
    debouncedSaveProgress,
    onTextSelectionOpened: () => {
      setSelectionMenuKey((key) => key + 1);
    },
  });

  // Wire up handleBack ref for idle timeout
  handleBackRef.current = handleBack;

  // ---- Idle timeout: 5 minutes no activity -> return to bookshelf ----
  const { idleCountdown, resetIdleTimer: _resetIdleTimer } = useIdleTimeout(() => handleBackRef.current?.(), !isSpeaking);

  // ---- Idle timeout handled by useIdleTimeout hook ----

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

  // ---- Fullscreen handled by useReaderFullscreen hook ----

  const { handleToggleBookmark, handleBookmarkEdit, handleBookmarkDelete } =
    useBookmarkActions({
      bookId,
      currentCfiRef,
      currentPage,
      bookmarks,
      progressRef,
      onBookmarkAdded: (bookmark) => {
        setBookmarks((prev) => [bookmark, ...prev]);
      },
      onBookmarkRemoved: (id) => {
        setBookmarks((prev) => prev.filter((bookmark) => bookmark.id !== id));
      },
      onBookmarkUpdated: (id, updates) => {
        setBookmarks((prev) =>
          prev.map((bookmark) =>
            bookmark.id === id ? { ...bookmark, ...updates } : bookmark
          )
        );
      },
      setIsCurrentBookmarked,
    });

  const {
    handleHighlight,
    handleAddNote,
    handleCopyText,
    handleSaveNote,
    handleNoteDelete,
    handleNoteEdit,
  } = useNoteActions({
    bookId,
    selectionMenu,
    noteEditor,
    progressRef,
    currentPage,
    onHighlightAdded: (highlight) => {
      setHighlights((prev) => [...prev, highlight]);
    },
    onHighlightRemoved: (id) => {
      setHighlights((prev) => prev.filter((highlight) => highlight.id !== id));
    },
    onHighlightUpdated: (id, updates) => {
      setHighlights((prev) =>
        prev.map((highlight) =>
          highlight.id === id ? { ...highlight, ...updates } : highlight
        )
      );
    },
    onNoteAdded: (note) => {
      setNotes((prev) => [note, ...prev]);
    },
    onNoteRemoved: (id) => {
      setNotes((prev) => prev.filter((note) => note.id !== id));
    },
    onNoteUpdated: (id, updates) => {
      setNotes((prev) =>
        prev.map((note) => (note.id === id ? { ...note, ...updates } : note))
      );
    },
    setSelectionMenu,
    setNoteEditor,
  });

  // ---- Settings handlers ----
  const handleFontSizeChange = useCallback((size: number) => {
    settings.setFontSize(size);
  }, [settings]);

  const handleFontFamilyChange = useCallback((family: FontFamily) => {
    settings.setFontFamily(family);
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

  const {
    hasPendingResume,
    pausePlayback: handlePauseTts,
    playAudioSource,
    resumePendingPlayback,
    resumePlayback: handleResumeTts,
    stopCurrentAudio,
    stopTransport,
  } = useReaderTtsAudio({
    bookTitle: book?.title,
    bookAuthor: book?.author,
    activeTtsParagraph,
    currentParagraphIndexRef,
    isPaused,
    isSpeaking,
    requestMicrosoftSpeech,
    selectedBrowserVoiceId,
    setIsPaused,
    setIsSpeaking,
    setIsTtsViewOpen,
    ttsRate,
    ttsSessionRef,
  });

  const stopSpeaking = useCallback(() => {
    ttsSessionRef.current += 1;
    allSentencesRef.current = [];
    readSentencesHashRef.current.clear();
    currentParagraphIndexRef.current = 0;
    ttsCurrentIndexRef.current = 0;
    ttsTotalSentencesRef.current = 0;
    stopTransport();
    setActiveTtsParagraph("");
    setActiveTtsParagraphId(null);
    setActiveTtsLocation(null);
    setIsSpeaking(false);
    setIsPaused(false);
    setIsTtsViewOpen(false);

    // Keep the reader on the currently spoken paragraph when stopping.
    if (book?.format === "epub") {
      epubReaderRef.current?.scrollToActiveParagraph();
    }
  }, [book?.format, stopTransport]);

  const { handleToggleTts, handleTtsNextParagraph, handleTtsPrevParagraph } =
    useReaderTtsSession({
      allSentencesRef,
      book,
      currentCfiRef,
      currentParagraphIndexRef,
      epubReaderRef,
      handlePauseTts,
      handleResumeTts,
      hasPendingResume,
      isPaused,
      isSpeaking,
      playAudioSource,
      readSentencesHashRef,
      requestMicrosoftSpeech,
      resumePendingPlayback,
      setActiveTtsLocation,
      setActiveTtsParagraph,
      setActiveTtsParagraphId,
      setIsPaused,
      setIsSpeaking,
      setIsTtsViewOpen,
      setToolbarVisible,
      stopCurrentAudio,
      ttsAutoNextChapter,
      ttsCurrentIndexRef,
      ttsSessionRef,
      ttsTotalSentencesRef,
    });

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, [stopSpeaking]);

  // Setup Media Session action handlers
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    
    navigator.mediaSession.setActionHandler("play", () => {
      if (!isSpeaking && hasPendingResume()) {
        resumePendingPlayback();
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
  }, [
    handlePauseTts,
    handleTtsNextParagraph,
    handleTtsPrevParagraph,
    hasPendingResume,
    isPaused,
    isSpeaking,
    resumePendingPlayback,
    stopSpeaking,
  ]);

  const handleOpenTtsView = useCallback(() => {
    setIsTtsViewOpen(true);
    setToolbarVisible(false);
  }, []);

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
      <div className="pointer-events-none fixed inset-x-0 top-0 z-0 h-28 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--reader-card-bg)_62%,transparent),transparent)]" />
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-0 h-24 bg-[linear-gradient(0deg,color-mix(in_srgb,var(--reader-card-bg)_42%,transparent),transparent)]" />

      {/* 简化的主容器 */}
      <div className="relative h-full w-full">
        {/* 阅读内容区域 */}
        <div className="h-full w-full px-1.5 py-4 sm:px-6">
          <div className="relative mx-auto h-full">
            {/* 顶部浮动标题 - 简化版 */}
            {!isSpeaking && !isTtsViewOpen ? (
              <div className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2">
                <div
                  className="reader-liquid-control pointer-events-auto inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs"
                  style={{ color: "var(--reader-muted-text)" }}
                >
                  <span className="truncate max-w-[120px]">{book.title}</span>
                  <span className="text-[10px]">{(progress * 100).toFixed(0)}%</span>
                </div>
              </div>
            ) : null}

            {/* 阅读器主体 */}
            <div
              className="h-full w-full"
              style={{
                paddingTop: isTtsViewOpen ? 0 : 40,
                paddingBottom: isTtsViewOpen ? 0 : 24,
              }}
            >
              {book.format === "epub" && (
                <EpubReader
                  key={bookId}
                  ref={epubReaderRef}
                  url={bookUrl}
                  initialLocation={initialLocation}
                  fontSize={fontSize}
                  fontFamily={fontFamily}
                  theme={readerTheme}
                  onLocationChange={handleLocationChange}
                  onTocLoaded={handleTocLoaded}
                  onTextSelected={handleTextSelected}
                  onClick={isSpeaking ? undefined : handleToggleToolbar}
                  highlights={highlights}
                  activeTtsParagraph={activeTtsParagraph}
                  activeTtsParagraphId={activeTtsParagraphId}
                  activeTtsLocation={activeTtsLocation}
                  ttsHighlightColor={ttsHighlightColor}
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
        fontFamily={fontFamily}
        onFontFamilyChange={handleFontFamilyChange}
        theme={readerTheme}
        onThemeChange={handleThemeChange}
        browserVoices={browserVoices}
        selectedBrowserVoiceId={selectedBrowserVoiceId}
        onSelectedBrowserVoiceIdChange={handleSelectedBrowserVoiceIdChange}
        ttsRate={ttsRate}
        onTtsRateChange={settings.setTtsRate}
        microsoftPreloadCount={microsoftPreloadCount}
        onMicrosoftPreloadCountChange={settings.setMicrosoftPreloadCount}
        ttsHighlightColor={ttsHighlightColor}
        onTtsHighlightColorChange={settings.setTtsHighlightColor}
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
          progress={progress}
          ttsRate={ttsRate}
          selectedBrowserVoiceId={selectedBrowserVoiceId}
          browserVoices={browserVoices}
          isFullscreen={isFullscreen}
          onBackToReader={handleBackToReader}
          onToggle={handleToggleTts}
          onStop={stopSpeaking}
          onPrev={handleTtsPrevParagraph}
          onNext={handleTtsNextParagraph}
          onSelectedBrowserVoiceIdChange={handleSelectedBrowserVoiceIdChange}
          onTtsRateChange={settings.setTtsRate}
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
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        progress={progress}
      />

      {/* Idle countdown warning */}
      {idleCountdown !== null && idleCountdown > 0 && (
        <div
          className="reader-liquid-surface fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl"
          style={{
            color: "var(--reader-text)",
          }}
        >
          <span className="text-sm">
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
