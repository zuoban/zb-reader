import { act, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useReaderNavigation } from "./useReaderNavigation";
import type { EpubReaderRef } from "@/components/reader/EpubReader";
import type { Book } from "@/lib/db/schema";
import type { TocItem } from "@/types/reader";

interface SelectionMenuPosition {
  x: number;
  y: number;
  bottom?: number;
}

function createEpubReaderRef(overrides: Partial<EpubReaderRef> = {}) {
  return {
    current: {
      goToHref: vi.fn(),
      goToLocation: vi.fn(),
      nextPage: vi.fn(),
      prevPage: vi.fn(),
      scrollDown: vi.fn(),
      scrollUp: vi.fn(),
      getCurrentLocation: vi.fn(() => null),
      getActiveTtsLocation: vi.fn(() => null),
      getProgress: vi.fn(() => 0),
      getCurrentText: vi.fn(() => null),
      getCurrentParagraphs: vi.fn(() => []),
      isFirstVisibleParagraphComplete: vi.fn(() => false),
      scrollToActiveParagraph: vi.fn(),
      ...overrides,
    },
  };
}

type HookValue = ReturnType<typeof useReaderNavigation>;

function renderHookHarness({
  toc,
  currentHref,
  setToolbarVisible = vi.fn(),
  setSelectionMenu = vi.fn(),
}: {
  toc: TocItem[];
  currentHref?: string;
  setToolbarVisible?: (value: boolean | ((prev: boolean) => boolean)) => void;
  setSelectionMenu?: (
    value:
      | { visible: boolean; position: SelectionMenuPosition; cfiRange: string; text: string }
      | ((
          prev: { visible: boolean; position: SelectionMenuPosition; cfiRange: string; text: string }
        ) => { visible: boolean; position: SelectionMenuPosition; cfiRange: string; text: string })
  ) => void;
}) {
  const epubReaderRef = createEpubReaderRef();
  const values: { current: HookValue | null } = { current: null };

  function Harness() {
    values.current = useReaderNavigation({
      bookId: "book-1",
      book: { format: "epub" } as Book,
      epubReaderRef,
      saveProgress: vi.fn(),
      toc,
      currentHref,
      progressRef: { current: 0 },
      setToolbarVisible,
      setSelectionMenu,
      setToc: vi.fn(),
      setCurrentHref: vi.fn(),
      setProgress: vi.fn(),
      setCurrentPage: vi.fn(),
      setTotalPages: vi.fn(),
      currentLocationRef: { current: null },
      currentCfiRef: { current: null },
      bookmarks: [],
      setIsCurrentBookmarked: vi.fn(),
      debouncedSaveProgress: vi.fn(),
    });
    return null;
  }

  const result = render(<Harness />);
  return { ...result, epubReaderRef, values };
}

describe("useReaderNavigation", () => {
  it("skips same-file subheadings when navigating to the next chapter", () => {
    const toc: TocItem[] = [
      {
        label: "第一章",
        href: "chapter1.xhtml",
        subitems: [
          { label: "第一节", href: "chapter1.xhtml#section1" },
          { label: "第二节", href: "chapter1.xhtml#section2" },
        ],
      },
      { label: "第二章", href: "chapter2.xhtml" },
    ];
    const { epubReaderRef, values } = renderHookHarness({
      toc,
      currentHref: "chapter1.xhtml",
    });

    act(() => {
      values.current?.handleNextChapter();
    });

    expect(epubReaderRef.current.goToHref).toHaveBeenCalledWith("chapter2.xhtml");
  });

  it("skips same-file subheadings when navigating to the previous chapter", () => {
    const toc: TocItem[] = [
      { label: "第一章", href: "chapter1.xhtml" },
      {
        label: "第二章",
        href: "chapter2.xhtml",
        subitems: [
          { label: "第一节", href: "chapter2.xhtml#section1" },
          { label: "第二节", href: "chapter2.xhtml#section2" },
        ],
      },
    ];
    const { epubReaderRef, values } = renderHookHarness({
      toc,
      currentHref: "chapter2.xhtml",
    });

    act(() => {
      values.current?.handlePrevChapter();
    });

    expect(epubReaderRef.current.goToHref).toHaveBeenCalledWith("chapter1.xhtml");
  });

  it("allows toggling the toolbar while TTS is speaking", () => {
    const setToolbarVisible = vi.fn();
    const setSelectionMenu = vi.fn();
    const { values } = renderHookHarness({
      toc: [],
      setToolbarVisible,
      setSelectionMenu,
    });

    act(() => {
      values.current?.handleToggleToolbar();
    });

    expect(setToolbarVisible).toHaveBeenCalledWith(expect.any(Function));
    expect(setSelectionMenu).toHaveBeenCalledWith(expect.any(Function));
  });
});
