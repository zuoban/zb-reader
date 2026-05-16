"use client";

import { useCallback } from "react";
import { paragraphsToSentences, type Sentence } from "@/lib/textUtils";
import type { EpubReaderRef } from "@/components/reader/EpubReader";
import type { ReaderParagraph } from "@/types/reader";

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

interface ChapterNavigationDeps {
  allSentencesRef: React.MutableRefObject<Sentence[]>;
  epubReaderRef: React.MutableRefObject<EpubReaderRef | null>;
  getReadableParagraphs: () => ReaderParagraph[];
  getPageIdentity: () => string;
  waitForPageChange: (previousIdentity: string, sessionId: number) => Promise<boolean>;
  startTtsLoop: (sessionId: number, startIndex: number) => Promise<void>;
  abortPendingTtsRequests: () => void;
  stopCurrentAudio: () => void;
  readSentencesHashRef: React.MutableRefObject<Set<string>>;
  ttsSessionRef: React.MutableRefObject<number>;
  isSpeaking: boolean;
  isPaused: boolean;
  setActiveTtsParagraph: (paragraph: string) => void;
  setActiveTtsParagraphId: (id: string | null) => void;
  setActiveTtsSentenceIndexInParagraph: (index: number) => void;
  setActiveTtsLocation: (location: string | null) => void;
  setActiveTtsIsCodeBlock: (value: boolean) => void;
  setActiveTtsHtml: (html: string) => void;
  setIsSpeaking: (value: boolean) => void;
  setIsPaused: (value: boolean) => void;
}

function updateUIWithFirstSentence(
  paragraphs: ReaderParagraph[],
  allSentencesRef: React.MutableRefObject<Sentence[]>,
  setters: {
    setActiveTtsParagraph: (paragraph: string) => void;
    setActiveTtsParagraphId: (id: string | null) => void;
    setActiveTtsSentenceIndexInParagraph: (index: number) => void;
    setActiveTtsLocation: (location: string | null) => void;
    setActiveTtsIsCodeBlock: (value: boolean) => void;
    setActiveTtsHtml: (html: string) => void;
  }
) {
  if (paragraphs.length > 0) {
    const sentences = paragraphsToSentences(paragraphs);
    allSentencesRef.current = sentences;
    const first = sentences[0];
    if (first) {
      setters.setActiveTtsParagraph(first.text);
      setters.setActiveTtsParagraphId(first.paragraphId);
      setters.setActiveTtsSentenceIndexInParagraph(first.sentenceIndexInParagraph);
      setters.setActiveTtsLocation(first.location ?? null);
      setters.setActiveTtsIsCodeBlock(!!first.isCodeBlock);
      setters.setActiveTtsHtml(first.html || first.text);
    }
  }
}

export function useTtsChapterNavigation(deps: ChapterNavigationDeps) {
  const {
    allSentencesRef,
    epubReaderRef,
    getReadableParagraphs,
    getPageIdentity,
    waitForPageChange,
    startTtsLoop,
    abortPendingTtsRequests,
    stopCurrentAudio,
    readSentencesHashRef,
    ttsSessionRef,
    isSpeaking,
    isPaused,
    setActiveTtsParagraph,
    setActiveTtsParagraphId,
    setActiveTtsSentenceIndexInParagraph,
    setActiveTtsLocation,
    setActiveTtsIsCodeBlock,
    setActiveTtsHtml,
    setIsSpeaking,
    setIsPaused,
  } = deps;

  const chapterNavDeps = [
    abortPendingTtsRequests,
    epubReaderRef,
    getPageIdentity,
    getReadableParagraphs,
    isPaused,
    isSpeaking,
    readSentencesHashRef,
    setActiveTtsHtml,
    setActiveTtsIsCodeBlock,
    setActiveTtsLocation,
    setActiveTtsParagraph,
    setActiveTtsParagraphId,
    setActiveTtsSentenceIndexInParagraph,
    setIsPaused,
    setIsSpeaking,
    startTtsLoop,
    stopCurrentAudio,
    ttsSessionRef,
    waitForPageChange,
    allSentencesRef,
  ] as const;

  const handleTtsChapter = useCallback(
    async (direction: "prev" | "next") => {
      const wasPaused = isPaused || !isSpeaking;

      ttsSessionRef.current += 1;
      abortPendingTtsRequests();
      const sessionId = ttsSessionRef.current;
      stopCurrentAudio();
      readSentencesHashRef.current.clear();

      const previousIdentity = getPageIdentity();
      if (direction === "prev") {
        epubReaderRef.current?.prevPage();
      } else {
        epubReaderRef.current?.nextPage();
      }

      const moved = await waitForPageChange(previousIdentity, sessionId);
      if (!moved || ttsSessionRef.current !== sessionId) {
        if (ttsSessionRef.current === sessionId) setIsSpeaking(false);
        return;
      }

      allSentencesRef.current = [];
      setIsSpeaking(true);

      if (wasPaused) {
        setIsPaused(true);
        let paragraphs = getReadableParagraphs();
        if (paragraphs.length === 0) {
          await wait(220);
          paragraphs = getReadableParagraphs();
        }
        updateUIWithFirstSentence(paragraphs, allSentencesRef, {
          setActiveTtsParagraph,
          setActiveTtsParagraphId,
          setActiveTtsSentenceIndexInParagraph,
          setActiveTtsLocation,
          setActiveTtsIsCodeBlock,
          setActiveTtsHtml,
        });
      } else {
        setIsPaused(false);
        await startTtsLoop(sessionId, 0);
      }
    },
    chapterNavDeps
  );

  const handleTtsPrevChapter = useCallback(
    async () => {
      await handleTtsChapter("prev");
    },
    [handleTtsChapter]
  );

  const handleTtsNextChapter = useCallback(
    async () => {
      await handleTtsChapter("next");
    },
    [handleTtsChapter]
  );

  return {
    handleTtsPrevChapter,
    handleTtsNextChapter,
  };
}
