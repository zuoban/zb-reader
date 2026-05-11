"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import type { EpubReaderRef } from "@/components/reader/EpubReader";
import type { Book } from "@/lib/db/schema";
import { paragraphsToSentences, type Sentence } from "@/lib/textUtils";
import type { ReaderParagraph } from "@/types/reader";

const MAX_TTS_RETRY_COUNT = 5;
const TTS_RETRY_DELAY_MS = 450;

interface PlayAudioOptions {
  debugMeta?: { engine: "microsoft"; sentenceIndex?: number; paragraph?: string };
}

interface UseReaderTtsSessionParams {
  allSentencesRef: React.MutableRefObject<Sentence[]>;
  book: Book | null;
  currentCfiRef: React.MutableRefObject<string | null>;
  currentParagraphIndexRef: React.MutableRefObject<number>;
  epubReaderRef: React.MutableRefObject<EpubReaderRef | null>;
  handlePauseTts: () => void;
  handleResumeTts: () => void;
  hasPendingResume: () => boolean;
  isPaused: boolean;
  isSpeaking: boolean;
  playAudioSource: (
    source: string,
    sessionId: number,
    options?: PlayAudioOptions
  ) => Promise<void>;
  readSentencesHashRef: React.MutableRefObject<Set<string>>;
  requestMicrosoftSpeech: (text: string, options?: { prefetch?: boolean }) => Promise<string>;
  resumePendingPlayback: () => boolean;
  setActiveTtsHtml: (html: string) => void;
  setActiveTtsIsCodeBlock: (value: boolean) => void;
  setActiveTtsLocation: (location: string | null) => void;
  setActiveTtsParagraph: (paragraph: string) => void;
  setActiveTtsParagraphId: (id: string | null) => void;
  setIsPaused: (value: boolean) => void;
  setIsSpeaking: (value: boolean) => void;
  setIsTtsViewOpen: (value: boolean) => void;
  setToolbarVisible: (value: boolean) => void;
  stopCurrentAudio: () => void;
  ttsAutoNextChapter: boolean;
  ttsCurrentIndexRef: React.MutableRefObject<number>;
  ttsPreloadWindowSize: number;
  ttsSessionRef: React.MutableRefObject<number>;
  ttsTotalSentencesRef: React.MutableRefObject<number>;
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isRetryableTtsError(error: unknown) {
  if (!(error instanceof Error)) return true;

  if (!error.message.startsWith("audio_play_error")) {
    return true;
  }

  return !error.message.includes("NotAllowedError");
}

export function useReaderTtsSession({
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
  ttsPreloadWindowSize,
  ttsSessionRef,
  ttsTotalSentencesRef,
}: UseReaderTtsSessionParams) {
  const getReadableParagraphs = useCallback(() => {
    if (!book) return [] as ReaderParagraph[];

    if (book.format === "epub") {
      return epubReaderRef.current?.getCurrentParagraphs?.() || [];
    }

    return [] as ReaderParagraph[];
  }, [book, epubReaderRef]);

  // 保留以备将来使用
  const _getInitialParagraphIndex = useCallback(
    (_paragraphs: ReaderParagraph[]): number => {
      if (!book) return 0;

      if (book.format === "epub") {
        return 0;
      }

      return 0;
    },
    [book]
  );

  const getPageIdentity = useCallback(() => {
    if (!book) return "";

    if (book.format === "epub") {
      // Use pure CFI so scroll-only location updates do not look like a page turn.
      return currentCfiRef.current || "";
    }

    return "";
  }, [book, currentCfiRef]);

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

        await wait(120);
      }
      return false;
    },
    [getPageIdentity, ttsSessionRef]
  );

  const tryAutoTurnPage = useCallback(
    async (sessionId: number): Promise<boolean> => {
      if (!book || !ttsAutoNextChapter) return false;

      const previousIdentity = getPageIdentity();

      if (book.format !== "epub") {
        return false;
      }

      const epubInstance = epubReaderRef.current;
      if (!epubInstance) return false;

      const progress = epubInstance.getProgress();
      if (progress >= 0.995) {
        return false;
      }

      const epubContainer = document.querySelector(
        "#epub-viewer .epub-container"
      ) as HTMLElement | null;

      if (epubContainer) {
        const scrollBottom =
          epubContainer.scrollHeight -
          epubContainer.scrollTop -
          epubContainer.clientHeight;
        const isNearBottom = scrollBottom < 50;

        if (isNearBottom) {
          epubInstance.nextPage();
        } else {
          epubInstance.scrollDown();
        }
      } else {
        epubInstance.scrollDown();
      }

      return waitForPageChange(previousIdentity, sessionId);
    },
    [book, epubReaderRef, getPageIdentity, ttsAutoNextChapter, waitForPageChange]
  );

  const speakWithBrowserParagraphs = useCallback(
    async (sentences: Sentence[], sessionId: number, startIndex = 0) => {
      const punctuationOnlyRegex = /^[\s\p{P}\p{S}\p{Z}]*$/u;
      const queue = sentences.filter(
        (item) => item.text.trim().length > 0 && !punctuationOnlyRegex.test(item.text)
      );
      if (queue.length === 0) {
        toast.error("当前页面没有可朗读内容");
        return;
      }

      setIsSpeaking(true);

      const preparedTaskMap = new Map<number, Promise<string>>();
      const preloadWindowSize = Math.max(1, Math.floor(ttsPreloadWindowSize));

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
        const sentence = queue[i];
        setActiveTtsParagraph(sentence.text);
        setActiveTtsParagraphId(sentence.paragraphId);
        setActiveTtsLocation(sentence.location ?? null);
        setActiveTtsIsCodeBlock(!!sentence.isCodeBlock);
        setActiveTtsHtml(sentence.html || sentence.text);

        const hash = sentence.location || sentence.text.slice(0, 50);
        if (readSentencesHashRef.current.has(hash)) {
          ensurePreloadWindow(i + 1);
          continue;
        }

        ensurePreloadWindow(i + 1);

        let sentenceSucceeded = false;
        let lastError: unknown = null;

        for (let attempt = 1; attempt <= MAX_TTS_RETRY_COUNT; attempt += 1) {
          if (ttsSessionRef.current !== sessionId) {
            return;
          }

          let objectUrl: string | null = null;

          try {
            objectUrl = await (attempt === 1
              ? preparedTaskMap.get(i) ?? requestMicrosoftSpeech(sentence.text)
              : requestMicrosoftSpeech(sentence.text));

            await new Promise<void>((resolve, reject) => {
              if (ttsSessionRef.current !== sessionId) {
                resolve();
                return;
              }

              void playAudioSource(objectUrl as string, sessionId, {
                debugMeta: {
                  engine: "microsoft",
                  sentenceIndex: startIndex + i,
                },
              })
                .then(resolve)
                .catch(reject);
            });

            sentenceSucceeded = true;
            break;
          } catch (error) {
            lastError = error;
            stopCurrentAudio();

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

        if (!sentenceSucceeded) {
          if (ttsSessionRef.current === sessionId) {
            setActiveTtsParagraph("");
            setActiveTtsParagraphId(null);
            setActiveTtsLocation(null);
            setActiveTtsIsCodeBlock(false);
            setActiveTtsHtml("");
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
      currentParagraphIndexRef,
      playAudioSource,
      readSentencesHashRef,
      requestMicrosoftSpeech,
      setActiveTtsHtml,
      setActiveTtsIsCodeBlock,
      setActiveTtsLocation,
      setActiveTtsParagraph,
      setActiveTtsParagraphId,
      setIsSpeaking,
      stopCurrentAudio,
      ttsCurrentIndexRef,
      ttsPreloadWindowSize,
      ttsSessionRef,
    ]
  );

  const startTtsLoop = useCallback(async (sessionId: number, startIndex = 0) => {
    let sentences = allSentencesRef.current;
    if (sentences.length === 0) {
      let paragraphs = getReadableParagraphs();
      if (paragraphs.length === 0) {
        await wait(220);
        paragraphs = getReadableParagraphs();
      }
      if (paragraphs.length === 0) {
        toast.error("当前页面没有可朗读内容");
        setIsSpeaking(false);
        return;
      }
      sentences = paragraphsToSentences(paragraphs);
      allSentencesRef.current = sentences;
      ttsTotalSentencesRef.current = sentences.length;
    }

    currentParagraphIndexRef.current = startIndex;
    ttsCurrentIndexRef.current = startIndex;

    while (ttsSessionRef.current === sessionId) {
      const currentStart = currentParagraphIndexRef.current;
      const sentencesToRead = sentences.slice(currentStart);

      if (sentencesToRead.length === 0) {
        const moved = await tryAutoTurnPage(sessionId);
        if (!moved) break;
        
        // Refresh sentences after page turn
        let paragraphs = getReadableParagraphs();
        if (paragraphs.length === 0) {
          await wait(220);
          paragraphs = getReadableParagraphs();
        }
        if (paragraphs.length === 0) break;
        
        sentences = paragraphsToSentences(paragraphs);
        allSentencesRef.current = sentences;
        ttsTotalSentencesRef.current = sentences.length;
        currentParagraphIndexRef.current = 0;
        ttsCurrentIndexRef.current = 0;
        continue;
      }

      try {
        await speakWithBrowserParagraphs(sentencesToRead, sessionId, currentStart);
        sentencesToRead.forEach((sentence) => {
          readSentencesHashRef.current.add(
            sentence.location || sentence.text.slice(0, 50)
          );
        });
      } catch {
        break;
      }

      if (ttsSessionRef.current !== sessionId) break;

      const moved = await tryAutoTurnPage(sessionId);
      if (!moved) break;
      
      sentences = [];
      allSentencesRef.current = [];
    }

    if (ttsSessionRef.current === sessionId) {
      setActiveTtsParagraph("");
      setActiveTtsParagraphId(null);
      setActiveTtsLocation(null);
      setIsSpeaking(false);
      setIsTtsViewOpen(false);
    }
  }, [
    allSentencesRef,
    currentParagraphIndexRef,
    getReadableParagraphs,
    readSentencesHashRef,
    setActiveTtsLocation,
    setActiveTtsParagraph,
    setActiveTtsParagraphId,
    setIsSpeaking,
    setIsTtsViewOpen,
    speakWithBrowserParagraphs,
    tryAutoTurnPage,
    ttsCurrentIndexRef,
    ttsSessionRef,
    ttsTotalSentencesRef,
  ]);

  const handleToggleTts = useCallback(async () => {
    if (isSpeaking) {
      if (isPaused) {
        handleResumeTts();
      } else {
        handlePauseTts();
      }
      return;
    }

    if (hasPendingResume()) {
      setIsTtsViewOpen(true);
      resumePendingPlayback();
      return;
    }

    ttsSessionRef.current += 1;
    readSentencesHashRef.current.clear();
    const sessionId = ttsSessionRef.current;

    setIsTtsViewOpen(true);
    setToolbarVisible(false);
    setIsSpeaking(true);
    setIsPaused(false);

    await startTtsLoop(sessionId, 0);
  }, [
    handlePauseTts,
    handleResumeTts,
    hasPendingResume,
    isPaused,
    isSpeaking,
    readSentencesHashRef,
    resumePendingPlayback,
    setIsPaused,
    setIsSpeaking,
    setIsTtsViewOpen,
    setToolbarVisible,
    startTtsLoop,
    ttsSessionRef,
  ]);

  const handleTtsPrevChapter = useCallback(async () => {
    const wasPaused = isPaused || !isSpeaking;
    
    ttsSessionRef.current += 1;
    const sessionId = ttsSessionRef.current;
    stopCurrentAudio();
    readSentencesHashRef.current.clear();

    const previousIdentity = getPageIdentity();
    epubReaderRef.current?.prevPage();

    const moved = await waitForPageChange(previousIdentity, sessionId);
    if (!moved || ttsSessionRef.current !== sessionId) {
      if (ttsSessionRef.current === sessionId) setIsSpeaking(false);
      return;
    }

    allSentencesRef.current = [];
    setIsSpeaking(true);
    
    if (wasPaused) {
      setIsPaused(true);
      // Update UI with first sentence of new chapter
      let paragraphs = getReadableParagraphs();
      if (paragraphs.length === 0) {
        await wait(220);
        paragraphs = getReadableParagraphs();
      }
      if (paragraphs.length > 0) {
        const sentences = paragraphsToSentences(paragraphs);
        allSentencesRef.current = sentences;
        const first = sentences[0];
        if (first) {
          setActiveTtsParagraph(first.text);
          setActiveTtsParagraphId(first.paragraphId);
          setActiveTtsLocation(first.location ?? null);
          setActiveTtsIsCodeBlock(!!first.isCodeBlock);
          setActiveTtsHtml(first.html || first.text);
        }
      }
    } else {
      setIsPaused(false);
      await startTtsLoop(sessionId, 0);
    }
  }, [
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
    setIsPaused,
    setIsSpeaking,
    startTtsLoop,
    stopCurrentAudio,
    ttsSessionRef,
    waitForPageChange,
    allSentencesRef,
  ]);

  const handleTtsNextChapter = useCallback(async () => {
    const wasPaused = isPaused || !isSpeaking;
    
    ttsSessionRef.current += 1;
    const sessionId = ttsSessionRef.current;
    stopCurrentAudio();
    readSentencesHashRef.current.clear();

    const previousIdentity = getPageIdentity();
    epubReaderRef.current?.nextPage();

    const moved = await waitForPageChange(previousIdentity, sessionId);
    if (!moved || ttsSessionRef.current !== sessionId) {
      if (ttsSessionRef.current === sessionId) setIsSpeaking(false);
      return;
    }

    allSentencesRef.current = [];
    setIsSpeaking(true);

    if (wasPaused) {
      setIsPaused(true);
      // Update UI with first sentence of new chapter
      let paragraphs = getReadableParagraphs();
      if (paragraphs.length === 0) {
        await wait(220);
        paragraphs = getReadableParagraphs();
      }
      if (paragraphs.length > 0) {
        const sentences = paragraphsToSentences(paragraphs);
        allSentencesRef.current = sentences;
        const first = sentences[0];
        if (first) {
          setActiveTtsParagraph(first.text);
          setActiveTtsParagraphId(first.paragraphId);
          setActiveTtsLocation(first.location ?? null);
          setActiveTtsIsCodeBlock(!!first.isCodeBlock);
          setActiveTtsHtml(first.html || first.text);
        }
      }
    } else {
      setIsPaused(false);
      await startTtsLoop(sessionId, 0);
    }
  }, [
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
    setIsPaused,
    setIsSpeaking,
    startTtsLoop,
    stopCurrentAudio,
    ttsSessionRef,
    waitForPageChange,
    allSentencesRef,
  ]);

  return {
    handleToggleTts,
    handleTtsNextChapter,
    handleTtsPrevChapter,
  };
}
