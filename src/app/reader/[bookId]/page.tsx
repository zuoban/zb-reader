"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { SessionProvider, useSession } from "next-auth/react";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import dynamic from "next/dynamic";
import { ReaderErrorBoundary } from "@/components/reader/ReaderErrorBoundary";
import { ReaderToolbar } from "@/components/reader/ReaderToolbar";
import { SidePanel } from "@/components/reader/SidePanel";
import { ReadingSettings } from "@/components/reader/ReadingSettings";
import { FullscreenTtsView } from "@/components/reader/FullscreenTtsView";
import { TextSelectionMenu } from "@/components/reader/TextSelectionMenu";
import { NoteEditor } from "@/components/reader/NoteEditor";
import { TtsFloatingControl } from "@/components/reader/TtsFloatingControl";
import {
  useIdleTimeout,
  useBookmarkActions,
  useNoteActions,
  useReaderBookData,
  useReaderFullscreen,
  useReaderNavigation,
  useReaderSettingsLifecycle,
  useReaderTtsAudio,
} from "@/components/reader/hooks";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import type { EpubReaderRef, ReaderParagraph } from "@/components/reader/EpubReader";
import type { TocItem } from "@/types/reader";
import { ttsAudioCache, TtsAudioLruCache } from "@/lib/ttsAudioCache";
import { useProgressSyncCompat } from "@/hooks/useProgressSyncCompat";
import { useReaderSettingsStore, useDebouncedSettingsSave } from "@/stores/reader-settings";
import type { FontFamily } from "@/stores/reader-settings";
import { paragraphsToSentences, type Sentence } from "@/lib/textUtils";

// Dynamic import for EpubReader (client-only, depends on browser APIs)
const EpubReader = dynamic(() => import("@/components/reader/EpubReader"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  ),
});



const MAX_TTS_RETRY_COUNT = 5;
const TTS_RETRY_DELAY_MS = 450;
function normalizeTocHref(href?: string) {
  if (!href) return "";
  return href.split("#")[0]?.trim().toLowerCase() ?? "";
}

function buildMicrosoftTtsAudioUrl(params: {
  text: string;
  voiceName: string;
  rate: number;
  pitch: number;
  volume: number;
  prefetch?: boolean;
}) {
  const searchParams = new URLSearchParams({
    text: params.text,
    voiceName: params.voiceName,
    rate: String(params.rate),
    pitch: String(params.pitch),
    volume: String(params.volume),
  });

  if (params.prefetch) {
    searchParams.set("prefetch", "1");
  }

  return `/api/tts/microsoft?${searchParams.toString()}`;
}

function findCurrentChapterTitle(items: TocItem[], currentHref?: string): string | undefined {
  const targetHref = normalizeTocHref(currentHref);
  if (!targetHref) return undefined;

  for (const item of items) {
    const itemHref = normalizeTocHref(item.href);
    if (itemHref === targetHref || (itemHref && targetHref.startsWith(itemHref))) {
      return item.label;
    }

    if (item.subitems?.length) {
      const nestedMatch = findCurrentChapterTitle(item.subitems, currentHref);
      if (nestedMatch) return nestedMatch;
    }
  }

  return undefined;
}

function ReaderContent() {
  const router = useRouter();
  const params = useParams();
  const bookId = params.bookId as string;
  useSession();

  const epubReaderRef = useRef<EpubReaderRef>(null);

  // Reader state
  const [toolbarVisible, setToolbarVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentPage, setCurrentPage] = useState<number | undefined>();
  const [totalPages, setTotalPages] = useState<number | undefined>();
  // Refs for saveProgress to read without adding state to useCallback deps
  const currentPageRef = useRef<number | undefined>(undefined);
  const totalPagesRef = useRef<number | undefined>(undefined);

  // Settings from store
  const settings = useReaderSettingsStore();
  const fontSize = settings.fontSize;
  const fontFamily = settings.fontFamily;
  const readerTheme = settings.theme;
  const selectedBrowserVoiceId = settings.browserVoiceId;
  const ttsRate = settings.ttsRate;
  const microsoftPreloadCount = settings.microsoftPreloadCount;
  const ttsAutoNextChapter = settings.ttsAutoNextChapter;
  const ttsHighlightColor = settings.ttsHighlightColor;
  const debouncedSaveSettings = useDebouncedSettingsSave();

  // Local TTS state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isTtsViewOpen, setIsTtsViewOpen] = useState(false);

  // Side panel
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"toc" | "bookmarks" | "notes">("toc");
  const [toc, setToc] = useState<TocItem[]>([]);
  const [currentHref, setCurrentHref] = useState<string | undefined>();

  // Settings panel
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Fullscreen
  const { isFullscreen, toggleFullscreen: handleToggleFullscreen } = useReaderFullscreen();

  const [isCurrentBookmarked, setIsCurrentBookmarked] = useState(false);

  const handleMissingBook = useCallback(() => {
    router.push("/bookshelf");
  }, [router]);

  const handleProgressLoaded = useCallback((loadedProgress: number) => {
    setProgress(loadedProgress);
  }, []);

  const {
    book,
    loading,
    bookUrl,
    initialLocation,
    bookmarks,
    setBookmarks,
    notes,
    setNotes,
    highlights,
    setHighlights,
  } = useReaderBookData({
    bookId,
    onMissingBook: handleMissingBook,
    onProgressLoaded: handleProgressLoaded,
  });

  // Text selection
  const [selectionMenu, setSelectionMenu] = useState<{
    visible: boolean;
    position: { x: number; y: number };
    cfiRange: string;
    text: string;
  }>({ visible: false, position: { x: 0, y: 0 }, cfiRange: "", text: "" });
  const [selectionMenuKey, setSelectionMenuKey] = useState(0);

  // Note editor
  const [noteEditor, setNoteEditor] = useState<{
    open: boolean;
    selectedText: string;
    cfiRange: string;
    initialContent?: string;
    initialColor?: string;
    editingId?: string;
  }>({ open: false, selectedText: "", cfiRange: "" });

  // Progress sync using compat hook
  const progressSync = useProgressSyncCompat(bookId);
  const currentLocationRef = progressSync.currentLocationRef;
  const progressRef = progressSync.progressRef;
  const saveProgress = progressSync.saveProgress;
  const debouncedSaveProgress = progressSync.debouncedSaveProgress;

  const currentCfiRef = useRef<string | null>(null);

  const ttsSessionRef = useRef(0);
  const [activeTtsParagraph, setActiveTtsParagraph] = useState("");
  const [activeTtsParagraphId, setActiveTtsParagraphId] = useState<string | null>(null);
  const [activeTtsLocation, setActiveTtsLocation] = useState<string | null>(null);
  const currentParagraphIndexRef = useRef(0);
  const allSentencesRef = useRef<Sentence[]>([]);
  const readSentencesHashRef = useRef<Set<string>>(new Set<string>());
  const ttsCurrentIndexRef = useRef(0);
  const ttsTotalSentencesRef = useRef(0);
  const handleBackRef = useRef<(() => Promise<void>) | null>(null);

  const currentChapterTitle = useMemo(() => {
    return findCurrentChapterTitle(toc, currentHref) ?? book?.title;
  }, [book?.title, currentHref, toc]);

  const { browserVoices, currentTheme } = useReaderSettingsLifecycle(
    settings,
    debouncedSaveSettings
  );

  const handleBackToReader = useCallback(() => {
    setIsTtsViewOpen(false);
  }, []);

  const wait = useCallback((ms: number) => {
    return new Promise<void>((resolve) => {
      setTimeout(resolve, ms);
    });
  }, []);

  const isRetryableTtsError = useCallback((error: unknown) => {
    if (!(error instanceof Error)) return true;

    if (!error.message.startsWith("audio_play_error")) {
      return true;
    }

    return !error.message.includes("NotAllowedError");
  }, []);

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
    currentPageRef,
    totalPagesRef,
    bookmarks,
    setIsCurrentBookmarked,
    debouncedSaveProgress,
    onTextSelectionOpened: () => {
      setSelectionMenuKey((key) => key + 1);
    },
  });

  // Wire up handleBack ref for idle timeout
  handleBackRef.current = handleBack;

  // ---- Idle timeout: 5 minutes no activity -> return to bookshelf ----
  const { idleCountdown, resetIdleTimer: _resetIdleTimer } = useIdleTimeout(() => handleBackRef.current?.(), !isSpeaking);

  // ---- Idle timeout handled by useIdleTimeout hook ----

  // ---- Esc key to go back ----
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleBack();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleBack]);

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
      setHighlights((prev) => [...prev, highlight]);
    },
    onHighlightRemoved: (id) => {
      setHighlights((prev) => prev.filter((highlight) => highlight.id !== id));
    },
    onHighlightUpdated: (id, updates) => {
      setHighlights((prev) =>
        prev.map((highlight) =>
          highlight.id === id ? { ...highlight, ...updates } : highlight
        )
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

  // ---- Settings handlers ----
  const handleFontSizeChange = useCallback((size: number) => {
    settings.setFontSize(size);
  }, [settings]);

  const handleFontFamilyChange = useCallback((family: FontFamily) => {
    settings.setFontFamily(family);
  }, [settings]);

  const handleThemeChange = useCallback(async (theme: "light" | "dark" | "sepia") => {
    settings.setTheme(theme);
  }, [settings]);

  const handleSelectedBrowserVoiceIdChange = useCallback((voiceId: string) => {
    settings.setBrowserVoiceId(voiceId);
  }, [settings]);

  const requestMicrosoftSpeech = useCallback(
    async (text: string, options?: { prefetch?: boolean }) => {
      const ratePercent = Math.round((ttsRate - 1) * 100);

      // 检查缓存
      const cacheKey = TtsAudioLruCache.hashKey({
        engine: "microsoft",
        text,
        voiceName: selectedBrowserVoiceId,
        rate: ratePercent,
        pitch: 0,
        volume: 100,
      });
      const cached = ttsAudioCache.get(cacheKey);
      if (cached?.kind === "url" && !options?.prefetch) {
        return cached.audioUrl;
      }

      const audioUrl = buildMicrosoftTtsAudioUrl({
        text,
        voiceName: selectedBrowserVoiceId,
        rate: ratePercent,
        pitch: 0,
        volume: 100,
      });

      if (options?.prefetch) {
        const prefetchUrl = buildMicrosoftTtsAudioUrl({
          text,
          voiceName: selectedBrowserVoiceId,
          rate: ratePercent,
          pitch: 0,
          volume: 100,
          prefetch: true,
        });
        const res = await fetch(prefetchUrl, { method: "GET" });
        if (!res.ok && res.status !== 204) {
          const data = (await res.json().catch(() => null)) as
            | { error?: string; details?: string }
            | null;
          const message = data?.error || "朗读失败";
          const details = data?.details ? `: ${data.details}` : "";
          throw new Error(`${message}${details}`);
        }
      } else {
        // 使用稳定的同源 URL，避免移动端后台对 blob: 音频的兼容性问题
        ttsAudioCache.set(cacheKey, { kind: "url", audioUrl });
      }

      return audioUrl;
    },
    [selectedBrowserVoiceId, ttsRate]
  );

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
    activeTtsParagraph,
    currentParagraphIndexRef,
    isPaused,
    isSpeaking,
    requestMicrosoftSpeech,
    selectedBrowserVoiceId,
    setIsPaused,
    setIsSpeaking,
    setIsTtsViewOpen,
    ttsRate,
    ttsSessionRef,
  });

  const stopSpeaking = useCallback(() => {
    ttsSessionRef.current += 1;
    allSentencesRef.current = [];
    readSentencesHashRef.current.clear();
    currentParagraphIndexRef.current = 0;
    ttsCurrentIndexRef.current = 0;
    ttsTotalSentencesRef.current = 0;
    stopTransport();
    setActiveTtsParagraph("");
    setActiveTtsParagraphId(null);
    setActiveTtsLocation(null);
    setIsSpeaking(false);
    setIsPaused(false);
    setIsTtsViewOpen(false);

    // Keep the reader on the currently spoken paragraph when stopping.
    if (book?.format === "epub") {
      epubReaderRef.current?.scrollToActiveParagraph();
    }
  }, [book?.format, stopTransport]);

  const speakWithBrowserParagraphs = useCallback(
    async (sentences: Sentence[], sessionId: number, startIndex = 0) => {
      const punctuationOnlyRegex = /^[\s\p{P}\p{S}\p{Z}]*$/u;
      const queue = sentences.filter((item) => item.text.trim().length > 0 && !punctuationOnlyRegex.test(item.text));
      if (queue.length === 0) {
        toast.error("当前页面没有可朗读内容");
        return;
      }

      setIsSpeaking(true);

      const preparedTaskMap = new Map<number, Promise<string>>();
      const preloadWindowSize = 5; // 预加载5句

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

        // 跳过已读的句子（避免跨页重复朗读）
        const hash = sentence.location || sentence.text.slice(0, 50);
        if (readSentencesHashRef.current.has(hash)) {
          // 跳过后，仍然需要预加载，因为 i 在继续递增
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
            objectUrl = await (
              attempt === 1
                ? preparedTaskMap.get(i) ?? requestMicrosoftSpeech(sentence.text)
                : requestMicrosoftSpeech(sentence.text)
            );

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
      isRetryableTtsError,
      playAudioSource,
      requestMicrosoftSpeech,
      stopCurrentAudio,
      wait,
    ]
  );

  const getReadableParagraphs = useCallback(() => {
    if (!book) return [] as ReaderParagraph[];

    if (book.format === "epub") {
      const paragraphs = epubReaderRef.current?.getCurrentParagraphs?.() || [];
      return paragraphs;
    }

    return [] as ReaderParagraph[];
  }, [book]);

  /**
   * 获取朗读起始段落的索引：找到当前视口内第一个可见段落在段落列表中的位置。
   * - EPUB：getCurrentParagraphs 已经只返回视口内段落，始终从 0 开始
   */
  const getInitialParagraphIndex = useCallback((paragraphs: ReaderParagraph[]): number => {
    if (!book || paragraphs.length === 0) return 0;

    if (book.format === "epub") {
      // EPUB 已经只返回视口内段落，始终从头开始
      return 0;
    }

    return 0;
  }, [book]);

  const getPageIdentity = useCallback(() => {
    if (!book) return "";

    if (book.format === "epub") {
      // Use pure CFI (without scroll suffix) so TTS page-change detection
      // only triggers on actual chapter/section navigation, not scroll movement.
      return currentCfiRef.current || "";
    }

    return "";
  }, [book, currentPage, totalPages]);

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

        await new Promise((resolve) => setTimeout(resolve, 120));
      }
      return false;
    },
    [getPageIdentity]
  );

  const tryAutoTurnPage = useCallback(
    async (sessionId: number): Promise<boolean> => {
      if (!book || !ttsAutoNextChapter) return false;

      const previousIdentity = getPageIdentity();
      const _previousHref = currentHref;

      if (book.format === "epub") {
        // 在 scrolled-doc 模式下，每次只显示一个章节
        // 需要检测当前是否在章节末尾，然后调用 rendition.next()
        const epubInstance = epubReaderRef.current;
        if (!epubInstance) return false;
        
        const progress = epubInstance.getProgress();
        const _currentLocation = epubInstance.getCurrentLocation();
        
        // 如果已到整本书的末尾
        if (progress >= 0.995) {
          return false;
        }
        
        // 检查当前视口是否已经滚动到底部
        const epubContainer = document.querySelector("#epub-viewer .epub-container") as HTMLElement | null;
        if (epubContainer) {
          const scrollBottom = epubContainer.scrollHeight - epubContainer.scrollTop - epubContainer.clientHeight;
          const isNearBottom = scrollBottom < 50;
          
          if (isNearBottom) {
            // 已在当前章节底部，调用 next() 进入下一章节
            epubInstance.nextPage();
          } else {
            // 还在章节中间，继续向下滚动
            epubInstance.scrollDown();
          }
        } else {
          epubInstance.scrollDown();
        }
      } else {
        return false;
      }

      return waitForPageChange(previousIdentity, sessionId);
    },
    [book, currentPage, currentHref, getPageIdentity, totalPages, ttsAutoNextChapter, waitForPageChange]
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

    // 获取当前页面的段落
    let paragraphs = getReadableParagraphs();

    // 如果获取不到，稍作等待重试（可能页面刚加载）
    if (paragraphs.length === 0) {
      await new Promise((resolve) => setTimeout(resolve, 220));
      paragraphs = getReadableParagraphs();
    }

    if (paragraphs.length === 0) {
      toast.error("当前页面没有可朗读内容");
      return;
    }

    // 将段落分割为句子
    const sentences = paragraphsToSentences(paragraphs);
    if (sentences.length === 0) {
      toast.error("当前页面没有可朗读内容");
      return;
    }

    // 更新句子引用
    allSentencesRef.current = sentences;
    ttsTotalSentencesRef.current = sentences.length;

    currentParagraphIndexRef.current = getInitialParagraphIndex(paragraphs);
    ttsCurrentIndexRef.current = currentParagraphIndexRef.current;

    setIsTtsViewOpen(true);
    setToolbarVisible(false);
    setIsSpeaking(true);

    // 开始朗读循环
    while (ttsSessionRef.current === sessionId) {
      // 在循环开始时再次检查句子（因为翻页后会变）
      if (sentences.length === 0) {
        paragraphs = getReadableParagraphs();
        if (paragraphs.length === 0) {
          // 再次尝试等待
          await new Promise((resolve) => setTimeout(resolve, 220));
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
        // 翻页后，从头开始读新的一页
        currentParagraphIndexRef.current = 0;
        ttsCurrentIndexRef.current = 0;
        allSentencesRef.current = newSentences;
        ttsTotalSentencesRef.current = newSentences.length;
        // 使用新的句子列表继续循环
        Object.assign(sentences, newSentences);
      }

      // 从当前索引开始切片
      const startIndex = currentParagraphIndexRef.current;
      const sentencesToRead = sentences.slice(startIndex);

      if (sentencesToRead.length === 0) {
        // 当前页读完了，尝试翻页
        const moved = await tryAutoTurnPage(sessionId);
        if (!moved) break;
        // 翻页后清空当前句子列表，以便下一次循环重新获取
        sentences.length = 0;
        continue;
      }

      try {
        await speakWithBrowserParagraphs(sentencesToRead, sessionId, startIndex);
        // 朗读成功后，记录这些句子的哈希
        sentencesToRead.forEach((s) => {
          readSentencesHashRef.current.add(s.location || s.text.slice(0, 50));
        });
      } catch {
        break;
      }

      if (ttsSessionRef.current !== sessionId) {
        break;
      }

      // 当前页读完（speak 函数返回意味着这一批读完了），准备翻页
      const moved = await tryAutoTurnPage(sessionId);
      if (!moved) {
        break;
      }
      // 翻页成功，清空句子缓存，下一轮循环会重新获取
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
    book,
    getInitialParagraphIndex,
    getReadableParagraphs,
    handlePauseTts,
    handleResumeTts,
    hasPendingResume,
    isPaused,
    isSpeaking,
    resumePendingPlayback,
    speakWithBrowserParagraphs,
    stopSpeaking,
    tryAutoTurnPage,
  ]);

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, [stopSpeaking]);

  const handleTtsPrevParagraph = useCallback(() => {
    let sentences = allSentencesRef.current;
    if (sentences.length === 0) {
      const paragraphs = getReadableParagraphs();
      sentences = paragraphsToSentences(paragraphs);
      allSentencesRef.current = sentences;
    }

    if (sentences.length === 0) return;

    const newIndex = Math.max(0, currentParagraphIndexRef.current - 1);

    if (newIndex === currentParagraphIndexRef.current && currentParagraphIndexRef.current === 0) return;

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
  }, [getReadableParagraphs, isPaused, isSpeaking, speakWithBrowserParagraphs, stopCurrentAudio]);

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

    if (newIndex === currentParagraphIndexRef.current && currentParagraphIndexRef.current === sentences.length - 1) return;

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
  }, [getReadableParagraphs, isPaused, isSpeaking, speakWithBrowserParagraphs, stopCurrentAudio]);

  // Setup Media Session action handlers
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    
    navigator.mediaSession.setActionHandler("play", () => {
      if (!isSpeaking && hasPendingResume()) {
        resumePendingPlayback();
      }
      navigator.mediaSession.playbackState = "playing";
    });
    
    navigator.mediaSession.setActionHandler("pause", () => {
      if (isSpeaking && !isPaused) {
        handlePauseTts();
      }
      navigator.mediaSession.playbackState = "paused";
    });
    
    navigator.mediaSession.setActionHandler("stop", () => {
      stopSpeaking();
    });
    
    navigator.mediaSession.setActionHandler("previoustrack", () => {
      handleTtsPrevParagraph();
    });
    
    navigator.mediaSession.setActionHandler("nexttrack", () => {
      handleTtsNextParagraph();
    });
    
    return () => {
      navigator.mediaSession.setActionHandler("play", null);
      navigator.mediaSession.setActionHandler("pause", null);
      navigator.mediaSession.setActionHandler("stop", null);
      navigator.mediaSession.setActionHandler("previoustrack", null);
      navigator.mediaSession.setActionHandler("nexttrack", null);
    };
  }, [
    handlePauseTts,
    handleTtsNextParagraph,
    handleTtsPrevParagraph,
    hasPendingResume,
    isPaused,
    isSpeaking,
    resumePendingPlayback,
    stopSpeaking,
  ]);

  const handleOpenTtsView = useCallback(() => {
    setIsTtsViewOpen(true);
    setToolbarVisible(false);
  }, []);

  if (loading || !book || !bookUrl) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!book) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">书籍不存在</p>
      </div>
    );
  }

  return (
    <div
      className={`isolate h-screen w-screen overflow-hidden ${currentTheme.bg}`}
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
      <div className="pointer-events-none fixed inset-x-0 top-0 z-0 h-28 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--reader-card-bg)_62%,transparent),transparent)]" />
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-0 h-24 bg-[linear-gradient(0deg,color-mix(in_srgb,var(--reader-card-bg)_42%,transparent),transparent)]" />

      {/* 简化的主容器 */}
      <div className="relative h-full w-full">
        {/* 阅读内容区域 */}
        <div className="h-full w-full px-1.5 py-4 sm:px-6">
          <div className="relative mx-auto h-full">
            {/* 顶部浮动标题 - 简化版 */}
            {!isSpeaking && !isTtsViewOpen ? (
              <div className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2">
                <div
                  className="reader-liquid-control pointer-events-auto inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs"
                  style={{ color: "var(--reader-muted-text)" }}
                >
                  <span className="truncate max-w-[120px]">{book.title}</span>
                  <span className="text-[10px]">{(progress * 100).toFixed(0)}%</span>
                </div>
              </div>
            ) : null}

            {/* 阅读器主体 */}
            <div
              className="h-full w-full"
              style={{
                paddingTop: isTtsViewOpen ? 0 : 40,
                paddingBottom: isTtsViewOpen ? 0 : 24,
              }}
            >
              {book.format === "epub" && (
                <EpubReader
                  key={bookId}
                  ref={epubReaderRef}
                  url={bookUrl}
                  initialLocation={initialLocation}
                  fontSize={fontSize}
                  fontFamily={fontFamily}
                  theme={readerTheme}
                  onLocationChange={handleLocationChange}
                  onTocLoaded={handleTocLoaded}
                  onTextSelected={handleTextSelected}
                  onClick={isSpeaking ? undefined : handleToggleToolbar}
                  highlights={highlights}
                  activeTtsParagraph={activeTtsParagraph}
                  activeTtsParagraphId={activeTtsParagraphId}
                  activeTtsLocation={activeTtsLocation}
                  ttsHighlightColor={ttsHighlightColor}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <ReaderToolbar
        visible={toolbarVisible && !isSpeaking && !isTtsViewOpen}
        title={book.title}
        currentChapterTitle={currentChapterTitle}
        currentPage={currentPage}
        totalPages={totalPages}
        progress={progress}
        isBookmarked={isCurrentBookmarked}
        isFullscreen={isFullscreen}
        onBack={handleBack}
        onToggleToc={() => {
          setSidePanelOpen(true);
          setActiveTab("toc");
        }}
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
        bookmarks={bookmarks.map((b) => ({
          id: b.id,
          label: b.label || "未命名书签",
          location: b.location,
          progress: b.progress || 0,
          createdAt: b.createdAt,
        }))}
        notes={notes.map((n) => ({
          id: n.id,
          selectedText: n.selectedText || "",
          content: n.content || "",
          color: n.color || "#facc15",
          location: n.location,
          createdAt: n.createdAt,
        }))}
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
        browserVoices={browserVoices}
        selectedBrowserVoiceId={selectedBrowserVoiceId}
        onSelectedBrowserVoiceIdChange={handleSelectedBrowserVoiceIdChange}
        ttsRate={ttsRate}
        onTtsRateChange={settings.setTtsRate}
        microsoftPreloadCount={microsoftPreloadCount}
        onMicrosoftPreloadCountChange={settings.setMicrosoftPreloadCount}
        ttsHighlightColor={ttsHighlightColor}
        onTtsHighlightColorChange={settings.setTtsHighlightColor}
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

      {book && (
        <FullscreenTtsView
          open={isTtsViewOpen}
          book={book}
          currentChapterTitle={currentChapterTitle}
          activeParagraph={activeTtsParagraph}
          isSpeaking={isSpeaking}
          isPaused={isPaused}
          progress={progress}
          ttsRate={ttsRate}
          selectedBrowserVoiceId={selectedBrowserVoiceId}
          browserVoices={browserVoices}
          isFullscreen={isFullscreen}
          onBackToReader={handleBackToReader}
          onToggle={handleToggleTts}
          onStop={stopSpeaking}
          onPrev={handleTtsPrevParagraph}
          onNext={handleTtsNextParagraph}
          onSelectedBrowserVoiceIdChange={handleSelectedBrowserVoiceIdChange}
          onTtsRateChange={settings.setTtsRate}
          onToggleFullscreen={handleToggleFullscreen}
        />
      )}

      <TtsFloatingControl
        hidden={isTtsViewOpen}
        isSpeaking={isSpeaking}
        isPaused={isPaused}
        onToggle={handleToggleTts}
        onStop={stopSpeaking}
        onPrev={handleTtsPrevParagraph}
        onNext={handleTtsNextParagraph}
        onOpenImmersiveView={handleOpenTtsView}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        progress={progress}
      />

      {/* Idle countdown warning */}
      {idleCountdown !== null && idleCountdown > 0 && (
        <div
          className="reader-liquid-surface fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl"
          style={{
            color: "var(--reader-text)",
          }}
        >
          <span className="text-sm">
            即将返回书架 ({idleCountdown}秒)
          </span>
        </div>
      )}

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
        <TooltipProvider>
          <ReaderErrorBoundary>
            <ReaderContent />
          </ReaderErrorBoundary>
        </TooltipProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
