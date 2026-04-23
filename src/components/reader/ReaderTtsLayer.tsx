"use client";

import { FullscreenTtsView } from "@/components/reader/FullscreenTtsView";
import { TtsFloatingControl } from "@/components/reader/TtsFloatingControl";
import type { Book } from "@/lib/db/schema";
import type { BrowserVoiceOption } from "@/lib/tts";

interface ReaderTtsLayerProps {
  activeParagraph: string;
  book: Book;
  browserVoices: BrowserVoiceOption[];
  currentChapterTitle?: string;
  isFullscreen: boolean;
  isPaused: boolean;
  isSpeaking: boolean;
  isTtsViewOpen: boolean;
  progress: number;
  selectedBrowserVoiceId: string;
  ttsRate: number;
  onBackToReader: () => void;
  onNext: () => void;
  onOpenImmersiveView: () => void;
  onPrev: () => void;
  onSelectedBrowserVoiceIdChange: (voiceId: string) => void;
  onStop: () => void;
  onToggle: () => void;
  onToggleFullscreen: () => void;
  onTtsRateChange: (value: number) => void;
}

export function ReaderTtsLayer({
  activeParagraph,
  book,
  browserVoices,
  currentChapterTitle,
  isFullscreen,
  isPaused,
  isSpeaking,
  isTtsViewOpen,
  progress,
  selectedBrowserVoiceId,
  ttsRate,
  onBackToReader,
  onNext,
  onOpenImmersiveView,
  onPrev,
  onSelectedBrowserVoiceIdChange,
  onStop,
  onToggle,
  onToggleFullscreen,
  onTtsRateChange,
}: ReaderTtsLayerProps) {
  return (
    <>
      <FullscreenTtsView
        open={isTtsViewOpen}
        book={book}
        currentChapterTitle={currentChapterTitle}
        activeParagraph={activeParagraph}
        isSpeaking={isSpeaking}
        isPaused={isPaused}
        progress={progress}
        ttsRate={ttsRate}
        selectedBrowserVoiceId={selectedBrowserVoiceId}
        browserVoices={browserVoices}
        isFullscreen={isFullscreen}
        onBackToReader={onBackToReader}
        onToggle={onToggle}
        onStop={onStop}
        onPrev={onPrev}
        onNext={onNext}
        onSelectedBrowserVoiceIdChange={onSelectedBrowserVoiceIdChange}
        onTtsRateChange={onTtsRateChange}
        onToggleFullscreen={onToggleFullscreen}
      />

      <TtsFloatingControl
        hidden={isTtsViewOpen}
        isSpeaking={isSpeaking}
        isPaused={isPaused}
        onToggle={onToggle}
        onStop={onStop}
        onPrev={onPrev}
        onNext={onNext}
        onOpenImmersiveView={onOpenImmersiveView}
        isFullscreen={isFullscreen}
        onToggleFullscreen={onToggleFullscreen}
        progress={progress}
      />
    </>
  );
}
