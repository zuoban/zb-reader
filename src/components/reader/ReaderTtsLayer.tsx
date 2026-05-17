"use client";

import { FullscreenTtsView } from "@/components/reader/FullscreenTtsView";

import { useBookData, useTts, useReaderUI, useNavigation } from "./providers";
import { useReaderSettingsStore } from "@/stores/reader-settings";

export function ReaderTtsLayer() {
  const { book } = useBookData();
  const {
    isSpeaking,
    isPaused,
    isTtsViewOpen,
    activeTtsHtml: activeHtml,
    activeTtsIsCodeBlock: activeIsCodeBlock,
    activeTtsParagraph: activeParagraph,
    handleToggleTts: onToggle,
    handlePauseTts: _onPause,
    handleResumeTts: _onResume,
    handleTtsNextChapter: onNext,
    handleTtsPrevChapter: onPrev,
    stopSpeaking: onStop,
    ttsVoices,
    loadTtsVoices,
    ttsRate,
    setTtsRate: onTtsRateChange,
    setIsTtsViewOpen,
  } = useTts();
  
  const { isFullscreen, toggleFullscreen: onToggleFullscreen, currentChapterTitle } = useReaderUI();
  const { progress } = useNavigation();
  
  const selectedTtsVoiceId = useReaderSettingsStore((s) => s.ttsVoiceId);
  const setTtsVoiceId = useReaderSettingsStore((s) => s.setTtsVoiceId);

  const onBackToReader = () => setIsTtsViewOpen(false);

  if (!book) return null;

  return (
    <>
      <FullscreenTtsView
        open={isTtsViewOpen}
        book={book}
        currentChapterTitle={currentChapterTitle}
        activeHtml={activeHtml}
        activeParagraph={activeParagraph}
        activeIsCodeBlock={activeIsCodeBlock}
        isSpeaking={isSpeaking}
        isPaused={isPaused}
        progress={progress}
        ttsRate={ttsRate}
        selectedTtsVoiceId={selectedTtsVoiceId}
        ttsVoices={ttsVoices}
        onLoadTtsVoices={loadTtsVoices}
        isFullscreen={isFullscreen}
        onBackToReader={onBackToReader}
        onToggle={onToggle}
        onStop={onStop}
        onPrev={onPrev}
        onNext={onNext}
        onSelectedTtsVoiceIdChange={setTtsVoiceId}
        onTtsRateChange={onTtsRateChange}
        onToggleFullscreen={onToggleFullscreen}
      />
    </>
  );
}
