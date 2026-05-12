"use client";

import React, { createContext, useContext, useCallback, useEffect } from "react";
import { 
  useReaderTtsState, 
  useReaderTtsAudio, 
  useReaderTtsSession, 
  useReaderMediaSessionActions,
  useBuiltinTtsSpeech
} from "@/components/reader/hooks";
import { useBookData } from "./BookDataProvider";
import { useReaderSettings } from "./ReaderSettingsProvider";
import { useReaderContext } from "@/components/reader/ReaderContext";
import { useReaderSettingsStore, useReaderSettingsValues } from "@/stores/reader-settings";

interface TtsContextValue {
  isSpeaking: boolean;
  isPaused: boolean;
  isTtsViewOpen: boolean;
  setIsTtsViewOpen: (open: boolean) => void;
  activeTtsHtml: string;
  activeTtsIsCodeBlock: boolean;
  activeTtsLocation: string | null;
  activeTtsParagraph: string;
  activeTtsParagraphId: string | null;
  activeTtsSentenceIndexInParagraph: number;
  handleToggleTts: () => void;
  handlePauseTts: () => void;
  handleResumeTts: () => void;
  handleTtsNextChapter: () => void;
  handleTtsPrevChapter: () => void;
  stopSpeaking: () => void;
  ttsVoices: any[];
  ttsRate: number;
  setTtsRate: (rate: number) => void;
}

const TtsContext = createContext<TtsContextValue | null>(null);

export function TtsProvider({ children }: { children: React.ReactNode }) {
  const { book } = useBookData();
  const { ttsVoices } = useReaderSettings();
  const { epubReaderRef, currentCfiRef, setToolbarVisible } = useReaderContext();
  
  const {
    ttsVoiceId: selectedTtsVoiceId,
    ttsRate,
    ttsPreloadCount,
    ttsAutoNextChapter,
  } = useReaderSettingsValues();
  const setTtsRate = useReaderSettingsStore((s) => s.setTtsRate);

  const ttsState = useReaderTtsState();
  const {
    setIsSpeaking,
    setIsPaused,
    setIsTtsViewOpen,
    resetTtsState,
    setActiveTtsHtml,
    setActiveTtsIsCodeBlock,
    setActiveTtsLocation,
    setActiveTtsParagraph,
    setActiveTtsParagraphId,
    setActiveTtsSentenceIndexInParagraph,
    ttsSessionRef,
    allSentencesRef,
    currentParagraphIndexRef,
    readSentencesHashRef,
    ttsCurrentIndexRef,
    ttsTotalSentencesRef,
    isSpeaking,
    isPaused,
  } = ttsState;

  const requestBuiltinSpeech = useBuiltinTtsSpeech(selectedTtsVoiceId, ttsRate);

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
    if (book?.format === "epub") {
      epubReaderRef.current?.scrollToActiveParagraph();
    }
  }, [book?.format, epubReaderRef, resetTtsState, stopTransport]);

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
      setActiveTtsSentenceIndexInParagraph,
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

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, [stopSpeaking]);

  const value = {
    ...ttsState,
    handleToggleTts,
    handlePauseTts,
    handleResumeTts,
    handleTtsNextChapter,
    handleTtsPrevChapter,
    stopSpeaking,
    ttsVoices,
    ttsRate,
    setTtsRate,
  };

  return (
    <TtsContext.Provider value={value}>
      {children}
    </TtsContext.Provider>
  );
}

export function useTts() {
  const context = useContext(TtsContext);
  if (!context) {
    throw new Error("useTts must be used within a TtsProvider");
  }
  return context;
}
