"use client";

import { useCallback, useRef } from "react";
import { toast } from "sonner";
import type { EpubReaderRef } from "@/components/reader/EpubReader";
import type { Book } from "@/lib/db/schema";
import { getTtsSentenceKey, paragraphsToSentences, type Sentence } from "@/lib/textUtils";
import type { ReaderParagraph } from "@/types/reader";

const MAX_TTS_RETRY_COUNT = 5;
const TTS_RETRY_DELAY_MS = 600;
const MAX_TTS_PRELOAD_CONCURRENCY = 3;

interface PlayAudioOptions {
  debugMeta?: { engine: "builtin"; sentenceIndex?: number; paragraph?: string };
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
  requestBuiltinSpeech: (
    text: string,
    options?: { prefetch?: boolean; signal?: AbortSignal }
  ) => Promise<string>;
  resumePendingPlayback: () => boolean;
  setActiveTtsHtml: (html: string) => void;
  setActiveTtsIsCodeBlock: (value: boolean) => void;
  setActiveTtsLocation: (location: string | null) => void;
  setActiveTtsParagraph: (paragraph: string) => void;
  setActiveTtsParagraphId: (id: string | null) => void;
  setActiveTtsSentenceIndexInParagraph: (index: number) => void;
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
  ttsPreloadWindowSize,
  ttsSessionRef,
  ttsTotalSentencesRef,
}: UseReaderTtsSessionParams) {
  const ttsRequestAbortControllersRef = useRef<Set<AbortController>>(new Set());

  const createTtsRequestSignal = useCallback(() => {
    const controller = new AbortController();
    ttsRequestAbortControllersRef.current.add(controller);
    return {
      signal: controller.signal,
      cleanup: () => {
        ttsRequestAbortControllersRef.current.delete(controller);
      },
    };
  }, []);

  const abortPendingTtsRequests = useCallback(() => {
    ttsRequestAbortControllersRef.current.forEach((controller) => {
      controller.abort();
    });
    ttsRequestAbortControllersRef.current.clear();
  }, []);

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

  const getEpubScrollIdentity = useCallback(() => {
    if (typeof document === "undefined") return "";

    const epubContainer = document.querySelector(
      "#epub-viewer .epub-container"
    ) as HTMLElement | null;

    if (!epubContainer) return "";

    return [
      Math.round(epubContainer.scrollTop),
      epubContainer.scrollHeight,
      epubContainer.clientHeight,
    ].join(":");
  }, []);

  const getPageIdentity = useCallback(() => {
    if (!book) return "";

    if (book.format === "epub") {
      return `${currentCfiRef.current || ""}#${getEpubScrollIdentity()}`;
    }

    return "";
  }, [book, currentCfiRef, getEpubScrollIdentity]);

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

      // 记录过滤后句子对应的原始索引，避免索引偏移问题
      const filteredSentences: Array<{ sentence: Sentence; originalIndex: number }> = [];
      for (let i = 0; i < sentences.length; i += 1) {
        const item = sentences[i];
        if (item.text.trim().length > 0 && !punctuationOnlyRegex.test(item.text)) {
          filteredSentences.push({ sentence: item, originalIndex: i });
        }
      }

      if (filteredSentences.length === 0) {
        toast.error("当前页面没有可朗读内容");
        return;
      }

      setIsSpeaking(true);

      const preparedTaskMap = new Map<number, Promise<string>>();
      const queuedPreloadIndexes = new Set<number>();
      const preloadQueue: number[] = [];
      const preloadWindowSize = Math.max(1, Math.floor(ttsPreloadWindowSize));
      let activePreloadCount = 0;

      const removeQueuedPreload = (index: number) => {
        if (!queuedPreloadIndexes.delete(index)) return;
        const queuedIndex = preloadQueue.indexOf(index);
        if (queuedIndex >= 0) {
          preloadQueue.splice(queuedIndex, 1);
        }
      };

      const pumpPreloadQueue = () => {
        while (
          activePreloadCount < MAX_TTS_PRELOAD_CONCURRENCY &&
          preloadQueue.length > 0 &&
          ttsSessionRef.current === sessionId
        ) {
          const index = preloadQueue.shift()!;
          queuedPreloadIndexes.delete(index);
          if (preparedTaskMap.has(index)) continue;

          activePreloadCount += 1;
          const requestSignal = createTtsRequestSignal();
          const task = requestBuiltinSpeech(filteredSentences[index].sentence.text, {
            prefetch: true,
            signal: requestSignal.signal,
          }).finally(() => {
            activePreloadCount = Math.max(0, activePreloadCount - 1);
            requestSignal.cleanup();
            pumpPreloadQueue();
          });
          task.catch(() => {
            // avoid unhandled promise rejection for preloaded items
          });
          preparedTaskMap.set(index, task);
        }
      };

      const ensurePreloadWindow = (windowStart: number) => {
        for (
          let cursor = windowStart;
          cursor < Math.min(filteredSentences.length, windowStart + preloadWindowSize);
          cursor += 1
        ) {
          if (!preparedTaskMap.has(cursor) && !queuedPreloadIndexes.has(cursor)) {
            queuedPreloadIndexes.add(cursor);
            preloadQueue.push(cursor);
          }
        }
        pumpPreloadQueue();
      };

      ensurePreloadWindow(0);

      for (let i = 0; i < filteredSentences.length; i += 1) {
        if (ttsSessionRef.current !== sessionId) {
          return;
        }

        const { sentence, originalIndex } = filteredSentences[i];
        // 使用原始索引，而不是过滤后的索引
        currentParagraphIndexRef.current = startIndex + originalIndex;
        ttsCurrentIndexRef.current = startIndex + originalIndex;
        setActiveTtsParagraph(sentence.text);
        setActiveTtsParagraphId(sentence.paragraphId);
        setActiveTtsSentenceIndexInParagraph(sentence.sentenceIndexInParagraph);
        setActiveTtsLocation(sentence.location ?? null);
        setActiveTtsIsCodeBlock(!!sentence.isCodeBlock);
        setActiveTtsHtml(sentence.html || sentence.text);

        const hash = getTtsSentenceKey(sentence, startIndex + originalIndex);
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
            if (attempt === 1 && preparedTaskMap.has(i)) {
              objectUrl = await preparedTaskMap.get(i)!;
            } else {
              removeQueuedPreload(i);
              const requestSignal = createTtsRequestSignal();
              objectUrl = await requestBuiltinSpeech(sentence.text, {
                signal: requestSignal.signal,
              }).finally(requestSignal.cleanup);
            }

            await new Promise<void>((resolve, reject) => {
              if (ttsSessionRef.current !== sessionId) {
                resolve();
                return;
              }

              void playAudioSource(objectUrl as string, sessionId, {
                debugMeta: {
                  engine: "builtin",
                  sentenceIndex: startIndex + originalIndex,
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
            setActiveTtsSentenceIndexInParagraph(0);
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

      // 使用最后一个句子的原始索引
      const lastOriginalIndex = filteredSentences[filteredSentences.length - 1].originalIndex;
      currentParagraphIndexRef.current = startIndex + lastOriginalIndex + 1;
      ttsCurrentIndexRef.current = startIndex + lastOriginalIndex + 1;
    },
    [
      currentParagraphIndexRef,
      createTtsRequestSignal,
      playAudioSource,
      readSentencesHashRef,
      requestBuiltinSpeech,
      setActiveTtsHtml,
      setActiveTtsIsCodeBlock,
      setActiveTtsLocation,
      setActiveTtsParagraph,
      setActiveTtsParagraphId,
      setActiveTtsSentenceIndexInParagraph,
      setIsSpeaking,
      stopCurrentAudio,
      ttsCurrentIndexRef,
      ttsPreloadWindowSize,
      ttsSessionRef,
    ]
  );

  const startTtsLoop = useCallback(async (sessionId: number, startIndex = 0) => {
    const refreshSentences = async () => {
      let paragraphs = getReadableParagraphs();
      if (paragraphs.length === 0) {
        await wait(220);
        paragraphs = getReadableParagraphs();
      }

      if (paragraphs.length === 0) {
        return [] as Sentence[];
      }

      const nextSentences = paragraphsToSentences(paragraphs);
      allSentencesRef.current = nextSentences;
      ttsTotalSentencesRef.current = nextSentences.length;
      currentParagraphIndexRef.current = 0;
      ttsCurrentIndexRef.current = 0;
      return nextSentences;
    };

    let sentences = allSentencesRef.current;
    if (sentences.length === 0) {
      sentences = await refreshSentences();
      if (sentences.length === 0) {
        toast.error("当前页面没有可朗读内容");
        setIsSpeaking(false);
        return;
      }
    }

    currentParagraphIndexRef.current = startIndex;
    ttsCurrentIndexRef.current = startIndex;

    while (ttsSessionRef.current === sessionId) {
      const currentStart = currentParagraphIndexRef.current;
      const sentencesToRead = sentences.slice(currentStart);

      if (sentencesToRead.length === 0) {
        const moved = await tryAutoTurnPage(sessionId);
        if (!moved) break;

        sentences = await refreshSentences();
        if (sentences.length === 0) break;
        continue;
      }

      try {
        await speakWithBrowserParagraphs(sentencesToRead, sessionId, currentStart);
        sentencesToRead.forEach((sentence, index) => {
          readSentencesHashRef.current.add(
            getTtsSentenceKey(sentence, currentStart + index)
          );
        });
      } catch {
        break;
      }

      if (ttsSessionRef.current !== sessionId) break;

      const moved = await tryAutoTurnPage(sessionId);
      if (!moved) break;

      sentences = await refreshSentences();
      if (sentences.length === 0) break;
    }

    if (ttsSessionRef.current === sessionId) {
      setActiveTtsParagraph("");
      setActiveTtsParagraphId(null);
      setActiveTtsSentenceIndexInParagraph(0);
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
    setActiveTtsSentenceIndexInParagraph,
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
    abortPendingTtsRequests();
    readSentencesHashRef.current.clear();
    const sessionId = ttsSessionRef.current;

    setIsTtsViewOpen(true);
    setToolbarVisible(false);
    setIsSpeaking(true);
    setIsPaused(false);

    await startTtsLoop(sessionId, 0);
  }, [
    abortPendingTtsRequests,
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
    abortPendingTtsRequests();
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
          setActiveTtsSentenceIndexInParagraph(first.sentenceIndexInParagraph);
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
  ]);

  const handleTtsNextChapter = useCallback(async () => {
    const wasPaused = isPaused || !isSpeaking;
    
    ttsSessionRef.current += 1;
    abortPendingTtsRequests();
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
          setActiveTtsSentenceIndexInParagraph(first.sentenceIndexInParagraph);
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
  ]);

  return {
    handleToggleTts,
    handleTtsNextChapter,
    handleTtsPrevChapter,
  };
}
