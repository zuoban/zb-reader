"use client";

import { useCallback, useRef, useState } from "react";
import type { Sentence } from "@/lib/textUtils";

export function useReaderTtsState() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isTtsViewOpen, setIsTtsViewOpen] = useState(false);
  const [activeTtsParagraph, setActiveTtsParagraph] = useState("");
  const [activeTtsParagraphId, setActiveTtsParagraphId] = useState<string | null>(null);
  const [activeTtsSentenceIndexInParagraph, setActiveTtsSentenceIndexInParagraph] =
    useState(0);
  const [activeTtsLocation, setActiveTtsLocation] = useState<string | null>(null);
  const [activeTtsIsCodeBlock, setActiveTtsIsCodeBlock] = useState(false);
  const [activeTtsHtml, setActiveTtsHtml] = useState("");

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
    setActiveTtsSentenceIndexInParagraph(0);
    setActiveTtsLocation(null);
    setActiveTtsIsCodeBlock(false);
    setActiveTtsHtml("");
    setIsSpeaking(false);
    setIsPaused(false);
    setIsTtsViewOpen(false);
  }, []);

  return {
    activeTtsHtml,
    activeTtsIsCodeBlock,
    activeTtsLocation,
    activeTtsParagraph,
    activeTtsParagraphId,
    activeTtsSentenceIndexInParagraph,
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
    setActiveTtsSentenceIndexInParagraph,
    setIsPaused,
    setIsSpeaking,
    setIsTtsViewOpen,
    ttsCurrentIndexRef,
    ttsSessionRef,
    ttsTotalSentencesRef,
  };
}
