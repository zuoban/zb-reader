import { useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { EpubReaderRef } from "@/components/reader/EpubReader";
import { READER_ROUTE_EXIT_EVENT } from "@/components/layout/ReaderRouteTransition";
import type { TocItem } from "@/types/reader";
import type { Book } from "@/lib/db/schema";

function flattenToc(items: TocItem[]): TocItem[] {
  return items.reduce((acc, item) => {
    acc.push(item);
    if (item.subitems && item.subitems.length > 0) {
      acc.push(...flattenToc(item.subitems));
    }
    return acc;
  }, [] as TocItem[]);
}

interface SelectionMenuPosition {
  x: number;
  y: number;
  bottom?: number;
}

interface UseReaderNavigationParams {
  bookId: string;
  book: Book | null;
  epubReaderRef: React.MutableRefObject<EpubReaderRef | null>;
  saveProgress: () => Promise<{ conflict?: boolean } | undefined>;
  toc: TocItem[];
  currentHref: string | undefined;
  progressRef: React.MutableRefObject<number | null>;
  isSpeaking: boolean;
  setToolbarVisible: (value: boolean | ((prev: boolean) => boolean)) => void;
  setSelectionMenu: (
    value:
      | { visible: boolean; position: SelectionMenuPosition; cfiRange: string; text: string }
      | ((
          prev: { visible: boolean; position: SelectionMenuPosition; cfiRange: string; text: string }
        ) => { visible: boolean; position: SelectionMenuPosition; cfiRange: string; text: string })
  ) => void;
  setToc: (items: TocItem[]) => void;
  setCurrentHref: (href: string | undefined) => void;
  setProgress: (progress: number) => void;
  setCurrentPage: (page: number | undefined) => void;
  setTotalPages: (pages: number | undefined) => void;
  currentLocationRef: React.MutableRefObject<string | null>;
  currentCfiRef: React.MutableRefObject<string | null>;
  bookmarks: Array<{ location: string }>;
  setIsCurrentBookmarked: (value: boolean) => void;
  debouncedSaveProgress: () => void;
  onTextSelectionOpened?: () => void;
}

interface UseReaderNavigationReturn {
  handleLocationChange: (location: {
    cfi: string;
    progress: number;
    currentPage?: number;
    totalPages?: number;
    href?: string;
    scrollRatio?: number;
  }) => void;
  handleTocLoaded: (tocItems: TocItem[]) => void;
  handleTextSelected: (cfiRange: string, text: string, position?: SelectionMenuPosition) => void;
  handleToggleToolbar: () => void;
  handleBack: () => Promise<void>;
  handleTocItemClick: (href: string) => void;
  handleBookmarkClick: (location: string) => void;
  handleNoteClick: (location: string) => void;
  handleProgressChange: (newProgress: number) => void;
  handlePrevPage: () => void;
  handleNextPage: () => void;
  handlePrevChapter: () => void;
  handleNextChapter: () => void;
  hasPrevChapter: boolean;
  hasNextChapter: boolean;
}

/**
 * Manages all reader navigation-related handlers.
 *
 * Includes location tracking, TOC/bookmark/note navigation, page turning,
 * and the "back to bookshelf" flow with transition animation.
 */
export function useReaderNavigation({
  bookId: _bookId,
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
  bookmarks,
  setIsCurrentBookmarked,
  debouncedSaveProgress,
  onTextSelectionOpened,
}: UseReaderNavigationParams): UseReaderNavigationReturn {
  const router = useRouter();

  const flatToc = useMemo(() => flattenToc(toc), [toc]);

  const handleLocationChange = useCallback(
    (location: {
      cfi: string;
      progress: number;
      currentPage?: number;
      totalPages?: number;
      href?: string;
      scrollRatio?: number;
    }) => {
      // Encode the scroll ratio into the location string so we can restore the
      // exact scroll position (not just the chapter/CFI) on the next open.
      // Format: "<cfi>#scroll=<ratio>" where ratio is a float in [0, 1].
      // If scrollRatio is undefined (e.g. no scroll info), we strip any previous
      // suffix to keep the stored value clean.
      let locationToSave = location.cfi;
      if (typeof location.scrollRatio === "number" && location.scrollRatio > 0) {
        locationToSave = `${location.cfi}#scroll=${location.scrollRatio.toFixed(4)}`;
      }
      currentLocationRef.current = locationToSave;
      currentCfiRef.current = location.cfi;
      progressRef.current = location.progress;
      if (location.currentPage != null) {
        setCurrentPage(location.currentPage);
      }
      if (location.totalPages != null) {
        setTotalPages(location.totalPages);
      }
      setProgress(location.progress);
      if (location.href) setCurrentHref(location.href);

      // Check if current location is bookmarked
      const isBookmarked = bookmarks.some((b) => b.location === location.cfi);
      setIsCurrentBookmarked(isBookmarked);

      debouncedSaveProgress();
    },
    [
      bookmarks,
      currentCfiRef,
      currentLocationRef,
      debouncedSaveProgress,
      progressRef,
      setCurrentHref,
      setCurrentPage,
      setIsCurrentBookmarked,
      setProgress,
      setTotalPages,
    ]
  );

  const handleTocLoaded = useCallback(
    (tocItems: TocItem[]) => {
      setToc(tocItems);
    },
    [setToc]
  );

  const handleTextSelected = useCallback((cfiRange: string, text: string, position?: SelectionMenuPosition) => {
    onTextSelectionOpened?.();
    setSelectionMenu({
      visible: true,
      position: position ?? { x: window.innerWidth / 2, y: 80, bottom: 120 },
      cfiRange,
      text,
    });
  }, [onTextSelectionOpened, setSelectionMenu]);

  const handleToggleToolbar = useCallback(() => {
    if (isSpeaking) {
      return;
    }
    setToolbarVisible((prev: boolean) => !prev);
    setSelectionMenu((prev) => ({ ...prev, visible: false }));
  }, [isSpeaking, setSelectionMenu, setToolbarVisible]);

  const isReturningRef = useRef(false);

  const navigateBack = useCallback(() => {
    const shouldSkipTransition =
      typeof window === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!shouldSkipTransition && book) {
      window.dispatchEvent(
        new CustomEvent(READER_ROUTE_EXIT_EVENT, {
          detail: {
            href: "/bookshelf",
            bookId: book.id,
            title: book.title || "未命名书籍",
            author: book.author || "未知作者",
            coverUrl: book.cover ? `/api/books/${book.id}/cover` : undefined,
            hasCover: Boolean(book.cover),
            format: book.format,
            initial: book.title?.charAt(0) || "书",
            rect: {
              left: window.innerWidth / 2 - 120,
              top: window.innerHeight / 2 - 180,
              width: 240,
              height: 326,
            },
          },
        })
      );
    }

    window.setTimeout(
      () => {
        router.push("/bookshelf");
      },
      shouldSkipTransition ? 0 : 130
    );
  }, [router, book]);

  const handleBack = useCallback(async () => {
    if (isReturningRef.current) return;
    isReturningRef.current = true;

    try {
      const saveResult = await saveProgress();

      if (saveResult?.conflict) {
        toast.info("进度存在冲突，已保留最新版本");
      }

      navigateBack();
    } catch {
      toast.error("进度保存失败，仍将返回书架");
      navigateBack();
    }
  }, [saveProgress, navigateBack]);

  const handleTocItemClick = useCallback((href: string) => {
    epubReaderRef.current?.goToHref(href);
  }, [epubReaderRef]);

  const handleBookmarkClick = useCallback((location: string) => {
    epubReaderRef.current?.goToLocation(location);
  }, [epubReaderRef]);

  const handleNoteClick = useCallback((location: string) => {
    epubReaderRef.current?.goToLocation(location);
  }, [epubReaderRef]);

  const handleProgressChange = useCallback((newProgress: number) => {
    epubReaderRef.current?.goToPercentage(newProgress);
  }, [epubReaderRef]);

  const handlePrevPage = useCallback(() => {
    if (book?.format === "epub") {
      epubReaderRef.current?.scrollUp();
    }
  }, [book?.format, epubReaderRef]);

  const handleNextPage = useCallback(() => {
    if (book?.format === "epub") {
      epubReaderRef.current?.scrollDown();
    }
  }, [book?.format, epubReaderRef]);

  const handlePrevChapter = useCallback(() => {
    if (book?.format !== "epub") return;

    if (flatToc.length === 0) {
      // Fallback if TOC is not loaded
      epubReaderRef.current?.prevPage();
      return;
    }

    let currentIndex = -1;
    if (currentHref) {
      // Try to find exact match or href containing currentHref
      currentIndex = flatToc.findIndex(
        (item) => item.href === currentHref || item.href.includes(currentHref) || currentHref.includes(item.href)
      );
    }

    if (currentIndex === -1) {
      const currentProgress = progressRef.current;
      currentIndex = Math.floor((currentProgress ?? 0) * flatToc.length);
    }

    if (currentIndex > 0) {
      const prevChapter = flatToc[currentIndex - 1];
      epubReaderRef.current?.goToHref(prevChapter.href);
    } else {
      // Already at first chapter, just scroll to top
      epubReaderRef.current?.goToPercentage(0);
    }
  }, [book?.format, currentHref, flatToc, epubReaderRef, progressRef]);

  const handleNextChapter = useCallback(() => {
    if (book?.format !== "epub") return;

    if (flatToc.length === 0) {
      // Fallback if TOC is not loaded
      epubReaderRef.current?.nextPage();
      return;
    }

    let currentIndex = -1;
    if (currentHref) {
      currentIndex = flatToc.findIndex(
        (item) => item.href === currentHref || item.href.includes(currentHref) || currentHref.includes(item.href)
      );
    }

    if (currentIndex === -1) {
      const currentProgress = progressRef.current;
      currentIndex = Math.floor((currentProgress ?? 0) * flatToc.length);
    }

    if (currentIndex !== -1 && currentIndex < flatToc.length - 1) {
      const nextChapter = flatToc[currentIndex + 1];
      epubReaderRef.current?.goToHref(nextChapter.href);
    }
  }, [book?.format, currentHref, flatToc, epubReaderRef, progressRef]);

  const { hasPrevChapter, hasNextChapter } = useMemo(() => {
    let prev = false;
    let next = false;

    if (book?.format === "epub" && flatToc.length > 0) {
      const currentIdx = flatToc.findIndex(
        (item) =>
          item.href === currentHref ||
          currentHref?.includes(item.href) ||
          item.href?.includes(currentHref || "")
      );

      if (currentIdx !== -1) {
        prev = currentIdx > 0;
        next = currentIdx < flatToc.length - 1;
      } else if (currentHref) {
        prev = true;
        next = true;
      }
    }

    return {
      hasPrevChapter: prev,
      hasNextChapter: next,
    };
  }, [book?.format, currentHref, flatToc]);

  return {
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
  };
}
