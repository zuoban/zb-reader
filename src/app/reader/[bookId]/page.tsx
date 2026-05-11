"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { SessionProvider } from "next-auth/react";
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
  useBuiltinTtsSpeech,
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
import { ReaderProvider, useReaderContext } from "@/components/reader/ReaderContext";
import type { EpubReaderRef } from "@/components/reader/EpubReader";
import type { Note } from "@/lib/db/schema";
import { useProgressSyncCompat } from "@/hooks/useProgressSyncCompat";
import {
  useDebouncedSettingsSave,
  useReaderSettingsControlsState,
  useReaderSettingsLifecycleState,
  useReaderSettingsStore,
  useReaderSettingsValues,
} from "@/stores/reader-settings";

function ReaderContent() {
  const router = useRouter();
  const params = useParams();
  const bookId = params.bookId as string;

  const {
    epubReaderRef,
    currentLocationRef,
    currentCfiRef,
    progressRef,
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
    handleBackRef,
  } = useReaderContext();

  // Settings from store
  const {
    fontSize,
    fontFamily,
    theme: readerTheme,
    browserVoiceId: selectedBrowserVoiceId,
    ttsRate,
    ttsPreloadCount,
    ttsAutoNextChapter,
    ttsHighlightColor,
  } = useReaderSettingsValues();
  const setTtsRate = useReaderSettingsStore((s) => s.setTtsRate);
  const _setTtsPreloadCount = useReaderSettingsStore((s) => s.setTtsPreloadCount);
  const setTtsHighlightColor = useReaderSettingsStore((s) => s.setTtsHighlightColor);
  const settingsLifecycleState = useReaderSettingsLifecycleState();
  const settingsControlsState = useReaderSettingsControlsState();
  const debouncedSaveSettings = useDebouncedSettingsSave();

  const {
    activeTtsHtml,
    activeTtsIsCodeBlock,
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
    setActiveTtsHtml,
    setActiveTtsIsCodeBlock,
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

  const handleMissingBook = useCallback(() => {
    router.push("/bookshelf");
  }, [router]);

  const handleProgressLoaded = useCallback((loadedProgress: number) => {
    setProgress(loadedProgress);
  }, []);

  const {
    book,
    loading,
    bookData,
    bookUrl,
    initialLocation,
    initialProgress,
    bookmarks,
    setBookmarks,
    notes,
    setNotes,
    highlights,
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
  const progressSync = useProgressSyncCompat(bookId, loading ? null : initialProgress ?? null, {
    currentLocationRef,
    progressRef,
  });
  const saveProgress = progressSync.saveProgress;
  const debouncedSaveProgress = progressSync.debouncedSaveProgress;

  const { browserVoices, currentTheme } = useReaderSettingsLifecycle(
    settingsLifecycleState,
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
  }, [setIsTtsViewOpen]);

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
    bookmarks,
    setIsCurrentBookmarked,
    debouncedSaveProgress,
    onTextSelectionOpened: () => {
      setSelectionMenuKey((key) => key + 1);
    },
  });

  // Wire up handleBack ref for idle timeout
  useEffect(() => {
    handleBackRef.current = handleBack;
  }, [handleBack]);

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
      const tempNote: Note = {
        id: highlight.id,
        bookId,
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
      setNotes((prev) => [tempNote, ...prev]);
    },
    onHighlightRemoved: (id) => {
      setNotes((prev) => prev.filter((note) => note.id !== id));
    },
    onHighlightUpdated: (id, updates) => {
      setNotes((prev) =>
        prev.map((note) => {
          if (note.id !== id) return note;
          return {
            ...note,
            ...(updates.color ? { color: updates.color } : {}),
          };
        })
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
  } = useReaderSettingsControls(settingsControlsState);

  const requestBuiltinSpeech = useBuiltinTtsSpeech(selectedBrowserVoiceId, ttsRate);

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
    setIsPaused,
    setIsSpeaking,
    setIsTtsViewOpen,
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

  const { handleToggleTts, handleTtsNextChapter, handleTtsPrevChapter } =
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
      requestBuiltinSpeech,
      resumePendingPlayback,
      setActiveTtsHtml,
      setActiveTtsIsCodeBlock,
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
      ttsPreloadWindowSize: ttsPreloadCount,
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
    onNext: handleTtsNextChapter,
    onPause: handlePauseTts,
    onPrev: handleTtsPrevChapter,
    onResumePending: resumePendingPlayback,
    onStop: stopSpeaking,
  });

  const handleOpenTtsView = useCallback(() => {
    setIsTtsViewOpen(true);
    setToolbarVisible(false);
  }, [setIsTtsViewOpen, setToolbarVisible]);

  if (loading || !book || (!bookData && !bookUrl)) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div
      className={`isolate h-screen w-screen overflow-hidden paper-texture ${currentTheme.bg}`}
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
      {/* Subtle Top & Bottom Fade */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-10 h-24 bg-gradient-to-b from-[var(--reader-bg)] to-transparent opacity-80" />
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-10 h-24 bg-gradient-to-t from-[var(--reader-bg)] to-transparent opacity-80" />

      <ReaderCanvas
        activeTtsLocation={activeTtsLocation}
        activeTtsParagraph={activeTtsParagraph}
        activeTtsParagraphId={activeTtsParagraphId}
        bookData={bookData}
        bookUrl={bookUrl}
        bookFormat={book.format}
        bookId={bookId}
        bookTitle={book.title}
        currentChapterTitle={currentChapterTitle}
        currentPage={currentPage}
        epubReaderRef={epubReaderRef}
        fontFamily={fontFamily}
        fontSize={fontSize}
        highlights={highlights}
        initialLocation={initialLocation}
        isSpeaking={isSpeaking}
        isTtsViewOpen={isTtsViewOpen}
        toolbarVisible={toolbarVisible}
        progress={progress}
        readerTheme={readerTheme}
        totalPages={totalPages}
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
        ttsHighlightColor={ttsHighlightColor}
        onTtsHighlightColorChange={setTtsHighlightColor}
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
        activeHtml={activeTtsHtml}
        activeIsCodeBlock={activeTtsIsCodeBlock}
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
        onNext={handleTtsNextChapter}
        onOpenImmersiveView={handleOpenTtsView}
        onPrev={handleTtsPrevChapter}
        onSelectedBrowserVoiceIdChange={handleSelectedBrowserVoiceIdChange}
        onStop={stopSpeaking}
        onToggle={handleToggleTts}
        onToggleFullscreen={handleToggleFullscreen}
        onTtsRateChange={setTtsRate}
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
        <ReaderProvider>
          <ReaderErrorBoundary>
            <ReaderContent />
          </ReaderErrorBoundary>
        </ReaderProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
