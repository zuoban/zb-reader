"use client";

import { useCallback, useRef, useState } from "react";
import type { Sentence } from "@/lib/textUtils";

export function useReaderTtsState() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isTtsViewOpen, setIsTtsViewOpen] = useState(false);
  const [activeTtsParagraph, setActiveTtsParagraph] = useState("");
  const [activeTtsParagraphId, setActiveTtsParagraphId] = useState<string | null>(null);
  const [activeTtsLocation, setActiveTtsLocation] = useState<string | null>(null);

  const ttsSessionRef = useRef(0);
  const currentParagraphIndexRef = useRef(0);
  const allSentencesRef = useRef<Sentence[]>([]);
  const readSentencesHashRef = useRef<Set<string>>(new Set<string>());
  const ttsCurrentIndexRef = useRef(0);
  const ttsTotalSentencesRef = useRef(0);

  const resetTtsState = useCallback(() => {
    ttsSessionRef.current += 1;
    allSentencesRef.current = [];
    readSentencesHashRef.current.clear();
    currentParagraphIndexRef.current = 0;
    ttsCurrentIndexRef.current = 0;
    ttsTotalSentencesRef.current = 0;
    setActiveTtsParagraph("");
    setActiveTtsParagraphId(null);
    setActiveTtsLocation(null);
    setIsSpeaking(false);
    setIsPaused(false);
    setIsTtsViewOpen(false);
  }, []);

  return {
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
  };
}
