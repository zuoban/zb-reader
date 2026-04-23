"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { SessionProvider, useSession } from "next-auth/react";
import { IdleCountdownWarning } from "@/components/reader/IdleCountdownWarning";
import { ReaderErrorBoundary } from "@/components/reader/ReaderErrorBoundary";
import { ReaderCanvas } from "@/components/reader/ReaderCanvas";
import { ReaderToolbar } from "@/components/reader/ReaderToolbar";
import { SidePanel } from "@/components/reader/SidePanel";
import { ReadingSettings } from "@/components/reader/ReadingSettings";
import { TextSelectionMenu } from "@/components/reader/TextSelectionMenu";
import { NoteEditor } from "@/components/reader/NoteEditor";
import { ReaderTtsLayer } from "@/components/reader/ReaderTtsLayer";
import {
  useIdleTimeout,
  useBookmarkActions,
  useMicrosoftTtsSpeech,
  useNoteActions,
  useReaderBookData,
  useReaderFullscreen,
  useReaderKeyboardShortcuts,
  useReaderMediaSessionActions,
  useReaderNavigation,
  useReaderSelectionState,
  useReaderSettingsControls,
  useReaderSettingsLifecycle,
  useReaderSidePanelState,
  useReaderTtsAudio,
  useReaderTtsSession,
  useReaderTtsState,
} from "@/components/reader/hooks";
import { Loader2 } from "lucide-react";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import type { EpubReaderRef } from "@/components/reader/EpubReader";
import { useProgressSyncCompat } from "@/hooks/useProgressSyncCompat";
import { useReaderSettingsStore, useDebouncedSettingsSave } from "@/stores/reader-settings";

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

  const {
    activeTtsLocation,
    activeTtsParagraph,
    activeTtsParagraphId,
    allSentencesRef,
    currentParagraphIndexRef,
    isPaused,
    isSpeaking,
    isTtsViewOpen,
    readSentencesHashRef,
    resetTtsState,
    setActiveTtsLocation,
    setActiveTtsParagraph,
    setActiveTtsParagraphId,
    setIsPaused,
    setIsSpeaking,
    setIsTtsViewOpen,
    ttsCurrentIndexRef,
    ttsSessionRef,
    ttsTotalSentencesRef,
  } = useReaderTtsState();

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

  const {
    noteEditor,
    selectionMenu,
    selectionMenuKey,
    setNoteEditor,
    setSelectionMenu,
    setSelectionMenuKey,
  } = useReaderSelectionState();

  // Progress sync using compat hook
  const progressSync = useProgressSyncCompat(bookId);
  const currentLocationRef = progressSync.currentLocationRef;
  const progressRef = progressSync.progressRef;
  const saveProgress = progressSync.saveProgress;
  const debouncedSaveProgress = progressSync.debouncedSaveProgress;

  const currentCfiRef = useRef<string | null>(null);

  const handleBackRef = useRef<(() => Promise<void>) | null>(null);

  const { browserVoices, currentTheme } = useReaderSettingsLifecycle(
    settings,
    debouncedSaveSettings
  );

  const {
    activeTab,
    currentChapterTitle,
    currentHref,
    open: sidePanelOpen,
    openToc: handleOpenToc,
    panelBookmarks: sidePanelBookmarks,
    panelNotes: sidePanelNotes,
    setActiveTab,
    setCurrentHref,
    setOpen: setSidePanelOpen,
    setToc,
    toc,
  } = useReaderSidePanelState({
    bookTitle: book?.title,
    bookmarks,
    notes,
  });

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

  useReaderKeyboardShortcuts({ onBack: handleBack });

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

  const {
    handleFontFamilyChange,
    handleFontSizeChange,
    handleSelectedBrowserVoiceIdChange,
    handleThemeChange,
  } = useReaderSettingsControls(settings);

  const requestMicrosoftSpeech = useMicrosoftTtsSpeech(selectedBrowserVoiceId, ttsRate);

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
    stopTransport();
    resetTtsState();

    // Keep the reader on the currently spoken paragraph when stopping.
    if (book?.format === "epub") {
      epubReaderRef.current?.scrollToActiveParagraph();
    }
  }, [book?.format, resetTtsState, stopTransport]);

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

  useReaderMediaSessionActions({
    hasPendingResume,
    isPaused,
    isSpeaking,
    onNext: handleTtsNextParagraph,
    onPause: handlePauseTts,
    onPrev: handleTtsPrevParagraph,
    onResumePending: resumePendingPlayback,
    onStop: stopSpeaking,
  });

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

      <ReaderCanvas
        activeTtsLocation={activeTtsLocation}
        activeTtsParagraph={activeTtsParagraph}
        activeTtsParagraphId={activeTtsParagraphId}
        bookFormat={book.format}
        bookId={bookId}
        bookTitle={book.title}
        bookUrl={bookUrl}
        epubReaderRef={epubReaderRef}
        fontFamily={fontFamily}
        fontSize={fontSize}
        highlights={highlights}
        initialLocation={initialLocation}
        isSpeaking={isSpeaking}
        isTtsViewOpen={isTtsViewOpen}
        progress={progress}
        readerTheme={readerTheme}
        ttsHighlightColor={ttsHighlightColor}
        onClick={handleToggleToolbar}
        onLocationChange={handleLocationChange}
        onTextSelected={handleTextSelected}
        onTocLoaded={handleTocLoaded}
      />

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
        onToggleToc={handleOpenToc}
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
        bookmarks={sidePanelBookmarks}
        notes={sidePanelNotes}
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

      <ReaderTtsLayer
        activeParagraph={activeTtsParagraph}
        book={book}
        browserVoices={browserVoices}
        currentChapterTitle={currentChapterTitle}
        isFullscreen={isFullscreen}
        isPaused={isPaused}
        isSpeaking={isSpeaking}
        isTtsViewOpen={isTtsViewOpen}
        progress={progress}
        selectedBrowserVoiceId={selectedBrowserVoiceId}
        ttsRate={ttsRate}
        onBackToReader={handleBackToReader}
        onNext={handleTtsNextParagraph}
        onOpenImmersiveView={handleOpenTtsView}
        onPrev={handleTtsPrevParagraph}
        onSelectedBrowserVoiceIdChange={handleSelectedBrowserVoiceIdChange}
        onStop={stopSpeaking}
        onToggle={handleToggleTts}
        onToggleFullscreen={handleToggleFullscreen}
        onTtsRateChange={settings.setTtsRate}
      />

      <IdleCountdownWarning seconds={idleCountdown} />

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
        <ReaderErrorBoundary>
          <ReaderContent />
        </ReaderErrorBoundary>
      </ThemeProvider>
    </SessionProvider>
  );
}
