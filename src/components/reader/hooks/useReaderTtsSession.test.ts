import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useReaderTtsSession } from "./useReaderTtsSession";
import type { Book } from "@/lib/db/schema";
import type { Sentence } from "@/lib/textUtils";
import type { EpubReaderRef } from "@/components/reader/EpubReader";

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    error: vi.fn(),
  }),
}));

function createSentence(text: string, paragraphId: string): Sentence {
  return {
    text,
    paragraphId,
    sentenceIndexInParagraph: 0,
    location: `epubcfi(/6/${paragraphId})`,
  };
}

function createRef<T>(current: T): React.MutableRefObject<T> {
  return { current };
}

describe("useReaderTtsSession", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="epub-viewer"><div class="epub-container"></div></div>';
    const container = document.querySelector(".epub-container") as HTMLElement;
    Object.defineProperty(container, "scrollHeight", { configurable: true, value: 1000 });
    Object.defineProperty(container, "clientHeight", { configurable: true, value: 500 });
    Object.defineProperty(container, "scrollTop", { configurable: true, value: 500 });
  });

  it("continues reading the next EPUB section without an auto-next setting", async () => {
    let pageIdentity = "chapter-1";
    const oldSentence = createSentence("第一章结束。", "old");
    const newParagraph = {
      id: "new",
      text: "第二章开始。",
      location: "epubcfi(/6/new)",
    };
    const currentCfiRef = createRef("epubcfi(/6/old)");

    const epubReader = {
      nextPage: vi.fn(async () => {
        pageIdentity = "chapter-2";
        currentCfiRef.current = "epubcfi(/6/new)";
      }),
      scrollDown: vi.fn(),
      getProgress: vi.fn().mockReturnValueOnce(0.5).mockReturnValueOnce(0.996),
      getCurrentParagraphs: vi.fn(() => (pageIdentity === "chapter-2" ? [newParagraph] : [])),
    } as unknown as EpubReaderRef;

    const playAudioSource = vi.fn(async () => {});
    const requestBuiltinSpeech = vi.fn(async (text: string) => `audio:${text}`);
    const setIsSpeaking = vi.fn();

    const { result } = renderHook(() =>
      useReaderTtsSession({
        allSentencesRef: createRef([oldSentence]),
        book: { format: "epub" } as Book,
        currentCfiRef,
        currentParagraphIndexRef: createRef(0),
        epubReaderRef: createRef(epubReader),
        handlePauseTts: vi.fn(),
        handleResumeTts: vi.fn(),
        hasPendingResume: vi.fn(() => false),
        isPaused: false,
        isSpeaking: false,
        playAudioSource,
        readSentencesHashRef: createRef(new Set<string>()),
        requestBuiltinSpeech,
        resumePendingPlayback: vi.fn(() => false),
        setActiveTtsHtml: vi.fn(),
        setActiveTtsIsCodeBlock: vi.fn(),
        setActiveTtsLocation: vi.fn(),
        setActiveTtsParagraph: vi.fn(),
        setActiveTtsParagraphId: vi.fn(),
        setActiveTtsSentenceIndexInParagraph: vi.fn(),
        setIsPaused: vi.fn(),
        setIsSpeaking,
        setIsTtsViewOpen: vi.fn(),
        setToolbarVisible: vi.fn(),
        stopCurrentAudio: vi.fn(),
        ttsCurrentIndexRef: createRef(0),
        ttsPreloadWindowSize: 1,
        ttsSessionRef: createRef(0),
        ttsTotalSentencesRef: createRef(1),
      } as unknown as Parameters<typeof useReaderTtsSession>[0])
    );

    await act(async () => {
      await result.current.handleToggleTts();
    });

    expect(epubReader.nextPage).toHaveBeenCalledTimes(1);
    expect(epubReader.scrollDown).not.toHaveBeenCalled();
    expect(playAudioSource).toHaveBeenCalledWith(
      "audio:第一章结束。",
      expect.any(Number),
      expect.any(Object)
    );
    expect(playAudioSource).toHaveBeenCalledWith(
      "audio:第二章开始。",
      expect.any(Number),
      expect.any(Object)
    );
    expect(setIsSpeaking).toHaveBeenLastCalledWith(false);
  });

  it("opens the TTS player with a current sentence preview without starting playback", async () => {
    const paragraph = {
      id: "preview",
      text: "这是第一句。这里是第二句。",
      location: "epubcfi(/6/preview)",
    };
    const epubReader = {
      getCurrentParagraphs: vi.fn(() => [paragraph]),
    } as unknown as EpubReaderRef;

    const playAudioSource = vi.fn(async () => {});
    const requestBuiltinSpeech = vi.fn(async (text: string) => `audio:${text}`);
    const setActiveTtsParagraph = vi.fn();
    const setActiveTtsParagraphId = vi.fn();
    const setActiveTtsSentenceIndexInParagraph = vi.fn();
    const setActiveTtsLocation = vi.fn();
    const setActiveTtsIsCodeBlock = vi.fn();
    const setActiveTtsHtml = vi.fn();
    const setIsSpeaking = vi.fn();
    const setIsTtsViewOpen = vi.fn();
    const setToolbarVisible = vi.fn();

    const { result } = renderHook(() =>
      useReaderTtsSession({
        allSentencesRef: createRef([]),
        book: { format: "epub" } as Book,
        currentCfiRef: createRef("epubcfi(/6/preview)"),
        currentParagraphIndexRef: createRef(0),
        epubReaderRef: createRef(epubReader),
        handlePauseTts: vi.fn(),
        handleResumeTts: vi.fn(),
        hasPendingResume: vi.fn(() => false),
        isPaused: false,
        isSpeaking: false,
        playAudioSource,
        readSentencesHashRef: createRef(new Set<string>()),
        requestBuiltinSpeech,
        resumePendingPlayback: vi.fn(() => false),
        setActiveTtsHtml,
        setActiveTtsIsCodeBlock,
        setActiveTtsLocation,
        setActiveTtsParagraph,
        setActiveTtsParagraphId,
        setActiveTtsSentenceIndexInParagraph,
        setIsPaused: vi.fn(),
        setIsSpeaking,
        setIsTtsViewOpen,
        setToolbarVisible,
        stopCurrentAudio: vi.fn(),
        ttsCurrentIndexRef: createRef(0),
        ttsPreloadWindowSize: 1,
        ttsSessionRef: createRef(0),
        ttsTotalSentencesRef: createRef(0),
      } as unknown as Parameters<typeof useReaderTtsSession>[0])
    );

    await act(async () => {
      await result.current.openTtsPlayer();
    });

    expect(setIsTtsViewOpen).toHaveBeenCalledWith(true);
    expect(setActiveTtsParagraph).toHaveBeenCalledWith("这是第一句。");
    expect(setActiveTtsHtml).toHaveBeenCalledWith("这是第一句。");
    expect(setActiveTtsParagraphId).toHaveBeenCalledWith("preview");
    expect(setActiveTtsSentenceIndexInParagraph).toHaveBeenCalledWith(0);
    expect(setActiveTtsLocation).toHaveBeenCalledWith("epubcfi(/6/preview)");
    expect(setActiveTtsIsCodeBlock).toHaveBeenCalledWith(false);
    expect(requestBuiltinSpeech).not.toHaveBeenCalled();
    expect(playAudioSource).not.toHaveBeenCalled();
    expect(setIsSpeaking).not.toHaveBeenCalledWith(true);
    expect(setToolbarVisible).not.toHaveBeenCalled();
  });
});
