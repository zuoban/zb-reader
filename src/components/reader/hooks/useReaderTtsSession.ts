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
}: UseReaderTtsSessionParams) {
  const getReadableParagraphs = useCallback(() => {
    if (!book) return [] as ReaderParagraph[];

    if (book.format === "epub") {
      return epubReaderRef.current?.getCurrentParagraphs?.() || [];
    }

    return [] as ReaderParagraph[];
  }, [book, epubReaderRef]);

  const getInitialParagraphIndex = useCallback(
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
      const preloadWindowSize = 5;

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
      setActiveTtsLocation,
      setActiveTtsParagraph,
      setActiveTtsParagraphId,
      setIsSpeaking,
      stopCurrentAudio,
      ttsCurrentIndexRef,
      ttsSessionRef,
    ]
  );

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

    let paragraphs = getReadableParagraphs();
    if (paragraphs.length === 0) {
      await wait(220);
      paragraphs = getReadableParagraphs();
    }

    if (paragraphs.length === 0) {
      toast.error("当前页面没有可朗读内容");
      return;
    }

    const sentences = paragraphsToSentences(paragraphs);
    if (sentences.length === 0) {
      toast.error("当前页面没有可朗读内容");
      return;
    }

    allSentencesRef.current = sentences;
    ttsTotalSentencesRef.current = sentences.length;
    currentParagraphIndexRef.current = getInitialParagraphIndex(paragraphs);
    ttsCurrentIndexRef.current = currentParagraphIndexRef.current;

    setIsTtsViewOpen(true);
    setToolbarVisible(false);
    setIsSpeaking(true);

    while (ttsSessionRef.current === sessionId) {
      if (sentences.length === 0) {
        paragraphs = getReadableParagraphs();
        if (paragraphs.length === 0) {
          await wait(220);
          paragraphs = getReadableParagraphs();
        }
        if (paragraphs.length === 0) {
          toast.error("没有更多可朗读内容");
          break;
        }
        const newSentences = paragraphsToSentences(paragraphs);
        if (newSentences.length === 0) {
          toast.error("没有更多可朗读内容");
          break;
        }
        currentParagraphIndexRef.current = 0;
        ttsCurrentIndexRef.current = 0;
        allSentencesRef.current = newSentences;
        ttsTotalSentencesRef.current = newSentences.length;
        Object.assign(sentences, newSentences);
      }

      const startIndex = currentParagraphIndexRef.current;
      const sentencesToRead = sentences.slice(startIndex);

      if (sentencesToRead.length === 0) {
        const moved = await tryAutoTurnPage(sessionId);
        if (!moved) break;
        sentences.length = 0;
        continue;
      }

      try {
        await speakWithBrowserParagraphs(sentencesToRead, sessionId, startIndex);
        sentencesToRead.forEach((sentence) => {
          readSentencesHashRef.current.add(
            sentence.location || sentence.text.slice(0, 50)
          );
        });
      } catch {
        break;
      }

      if (ttsSessionRef.current !== sessionId) {
        break;
      }

      const moved = await tryAutoTurnPage(sessionId);
      if (!moved) {
        break;
      }
      sentences.length = 0;
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
    getInitialParagraphIndex,
    getReadableParagraphs,
    handlePauseTts,
    handleResumeTts,
    hasPendingResume,
    isPaused,
    isSpeaking,
    readSentencesHashRef,
    resumePendingPlayback,
    setActiveTtsLocation,
    setActiveTtsParagraph,
    setActiveTtsParagraphId,
    setIsSpeaking,
    setIsTtsViewOpen,
    setToolbarVisible,
    speakWithBrowserParagraphs,
    tryAutoTurnPage,
    ttsCurrentIndexRef,
    ttsSessionRef,
    ttsTotalSentencesRef,
  ]);

  const handleTtsPrevParagraph = useCallback(() => {
    let sentences = allSentencesRef.current;
    if (sentences.length === 0) {
      const paragraphs = getReadableParagraphs();
      sentences = paragraphsToSentences(paragraphs);
      allSentencesRef.current = sentences;
    }

    if (sentences.length === 0) return;

    const newIndex = Math.max(0, currentParagraphIndexRef.current - 1);
    if (newIndex === currentParagraphIndexRef.current && currentParagraphIndexRef.current === 0) {
      return;
    }

    const shouldResumePlayback = isSpeaking && !isPaused;

    ttsSessionRef.current += 1;
    const sessionId = ttsSessionRef.current;
    stopCurrentAudio();

    currentParagraphIndexRef.current = newIndex;
    ttsCurrentIndexRef.current = newIndex;
    setActiveTtsParagraph(sentences[newIndex].text);
    setActiveTtsParagraphId(sentences[newIndex].paragraphId);
    setActiveTtsLocation(sentences[newIndex].location ?? null);

    if (!shouldResumePlayback) {
      setIsSpeaking(true);
      setIsPaused(true);
      return;
    }

    const startSentences = sentences.slice(newIndex);
    setTimeout(() => {
      if (ttsSessionRef.current !== sessionId) return;
      setIsSpeaking(true);
      setIsPaused(false);
      void speakWithBrowserParagraphs(startSentences, sessionId, newIndex);
    }, 10);
  }, [
    allSentencesRef,
    currentParagraphIndexRef,
    getReadableParagraphs,
    isPaused,
    isSpeaking,
    setActiveTtsLocation,
    setActiveTtsParagraph,
    setActiveTtsParagraphId,
    setIsPaused,
    setIsSpeaking,
    speakWithBrowserParagraphs,
    stopCurrentAudio,
    ttsCurrentIndexRef,
    ttsSessionRef,
  ]);

  const handleTtsNextParagraph = useCallback(() => {
    let sentences = allSentencesRef.current;
    if (sentences.length === 0) {
      const paragraphs = getReadableParagraphs();
      sentences = paragraphsToSentences(paragraphs);
      allSentencesRef.current = sentences;
    }

    if (sentences.length === 0) return;

    const newIndex = Math.min(
      sentences.length - 1,
      currentParagraphIndexRef.current + 1
    );
    if (
      newIndex === currentParagraphIndexRef.current &&
      currentParagraphIndexRef.current === sentences.length - 1
    ) {
      return;
    }

    const shouldResumePlayback = isSpeaking && !isPaused;

    ttsSessionRef.current += 1;
    const sessionId = ttsSessionRef.current;
    stopCurrentAudio();

    currentParagraphIndexRef.current = newIndex;
    ttsCurrentIndexRef.current = newIndex;
    setActiveTtsParagraph(sentences[newIndex].text);
    setActiveTtsParagraphId(sentences[newIndex].paragraphId);
    setActiveTtsLocation(sentences[newIndex].location ?? null);

    if (!shouldResumePlayback) {
      setIsSpeaking(true);
      setIsPaused(true);
      return;
    }

    const startSentences = sentences.slice(newIndex);
    setTimeout(() => {
      if (ttsSessionRef.current !== sessionId) return;
      setIsSpeaking(true);
      setIsPaused(false);
      void speakWithBrowserParagraphs(startSentences, sessionId, newIndex);
    }, 10);
  }, [
    allSentencesRef,
    currentParagraphIndexRef,
    getReadableParagraphs,
    isPaused,
    isSpeaking,
    setActiveTtsLocation,
    setActiveTtsParagraph,
    setActiveTtsParagraphId,
    setIsPaused,
    setIsSpeaking,
    speakWithBrowserParagraphs,
    stopCurrentAudio,
    ttsCurrentIndexRef,
    ttsSessionRef,
  ]);

  return {
    handleToggleTts,
    handleTtsNextParagraph,
    handleTtsPrevParagraph,
  };
}
