import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { EpubReaderRef } from "@/components/reader/EpubReader";
import { READER_ROUTE_EXIT_EVENT } from "@/components/layout/ReaderRouteTransition";
import type { TocItem } from "@/types/reader";
import type { Book } from "@/lib/db/schema";

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
      | { visible: boolean; position: { x: number; y: number }; cfiRange: string; text: string }
      | ((
          prev: { visible: boolean; position: { x: number; y: number }; cfiRange: string; text: string }
        ) => { visible: boolean; position: { x: number; y: number }; cfiRange: string; text: string })
  ) => void;
  setToc: (items: TocItem[]) => void;
  setCurrentHref: (href: string | undefined) => void;
  setProgress: (progress: number) => void;
  setCurrentPage: (page: number | undefined) => void;
  setTotalPages: (pages: number | undefined) => void;
  currentLocationRef: React.MutableRefObject<string | null>;
  currentCfiRef: React.MutableRefObject<string | null>;
  currentPageRef: React.MutableRefObject<number | undefined>;
  totalPagesRef: React.MutableRefObject<number | undefined>;
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
  handleTextSelected: (cfiRange: string, text: string) => void;
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
  currentPageRef,
  totalPagesRef,
  bookmarks,
  setIsCurrentBookmarked,
  debouncedSaveProgress,
  onTextSelectionOpened,
}: UseReaderNavigationParams): UseReaderNavigationReturn {
  const router = useRouter();

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
      currentPageRef.current = location.currentPage;
      totalPagesRef.current = location.totalPages;
      setProgress(location.progress);
      setCurrentPage(location.currentPage);
      setTotalPages(location.totalPages);
      if (location.href) setCurrentHref(location.href);

      // Check if current location is bookmarked
      const isBookmarked = bookmarks.some((b) => b.location === location.cfi);
      setIsCurrentBookmarked(isBookmarked);

      debouncedSaveProgress();
    },
    [bookmarks, debouncedSaveProgress]
  );

  const handleTocLoaded = useCallback(
    (tocItems: TocItem[]) => {
      setToc(tocItems);
    },
    [setToc]
  );

  const handleTextSelected = useCallback((cfiRange: string, text: string) => {
    onTextSelectionOpened?.();
    setSelectionMenu({
      visible: true,
      position: { x: window.innerWidth / 2, y: 80 },
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
  }, [isSpeaking]);

  const handleBack = useCallback(async () => {
    const saveResult = await saveProgress();
    if (!saveResult?.conflict) {
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
    }
  }, [saveProgress, router, book]);

  const handleTocItemClick = useCallback((href: string) => {
    epubReaderRef.current?.goToHref(href);
  }, []);

  const handleBookmarkClick = useCallback((location: string) => {
    epubReaderRef.current?.goToLocation(location);
  }, []);

  const handleNoteClick = useCallback((location: string) => {
    epubReaderRef.current?.goToLocation(location);
  }, []);

  const handleProgressChange = useCallback((newProgress: number) => {
    epubReaderRef.current?.goToPercentage(newProgress);
  }, []);

  const handlePrevPage = useCallback(() => {
    if (book?.format === "epub") {
      epubReaderRef.current?.scrollUp();
    }
  }, [book?.format]);

  const handleNextPage = useCallback(() => {
    if (book?.format === "epub") {
      epubReaderRef.current?.scrollDown();
    }
  }, [book?.format]);

  const handlePrevChapter = useCallback(() => {
    if (book?.format !== "epub") return;

    // Method 1: Use rendition.prev() - scrolled-doc mode
    const epubInstance = epubReaderRef.current;
    if (epubInstance) {
      epubInstance.prevPage();
      return;
    }

    // Method 2: Use TOC navigation (fallback)
    if (toc.length === 0) return;

    let currentIndex = -1;
    if (currentHref) {
      currentIndex = toc.findIndex(
        (item) => item.href === currentHref || item.href.includes(currentHref)
      );
    }

    if (currentIndex === -1) {
      const currentProgress = progressRef.current;
      currentIndex = Math.floor((currentProgress ?? 0) * toc.length) - 1;
      currentIndex = Math.max(0, currentIndex);
    }

    if (currentIndex > 0) {
      const prevChapter = toc[currentIndex - 1];
      epubReaderRef.current?.goToHref(prevChapter.href);
    }
  }, [book?.format, currentHref, toc]);

  const handleNextChapter = useCallback(() => {
    if (book?.format !== "epub") return;

    // Method 1: Use rendition.next() - scrolled-doc mode
    const epubInstance = epubReaderRef.current;
    if (epubInstance) {
      epubInstance.nextPage();
      return;
    }

    // Method 2: Use TOC navigation (fallback)
    if (toc.length === 0) return;

    let currentIndex = -1;
    if (currentHref) {
      currentIndex = toc.findIndex(
        (item) => item.href === currentHref || item.href.includes(currentHref)
      );
    }

    if (currentIndex === -1) {
      const currentProgress = progressRef.current;
      currentIndex = Math.floor((currentProgress ?? 0) * toc.length);
    }

    if (currentIndex !== -1 && currentIndex < toc.length - 1) {
      const nextChapter = toc[currentIndex + 1];
      epubReaderRef.current?.goToHref(nextChapter.href);
    }
  }, [book?.format, currentHref, toc]);

  const { hasPrevChapter, hasNextChapter } = useMemo(() => {
    let prev = false;
    let next = false;

    if (book?.format === "epub" && toc.length > 0) {
      const currentIdx = toc.findIndex(
        (item) =>
          item.href === currentHref ||
          currentHref?.includes(item.href) ||
          item.href?.includes(currentHref || "")
      );

      if (currentIdx !== -1) {
        prev = currentIdx > 0;
        next = currentIdx < toc.length - 1;
      } else if (currentHref) {
        prev = true;
        next = true;
      }
    }

    return {
      hasPrevChapter: prev,
      hasNextChapter: next,
    };
  }, [book?.format, currentHref, toc]);

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
