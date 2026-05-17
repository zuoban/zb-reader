import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ReaderToolbar } from "./ReaderToolbar";

const toolbarState = vi.hoisted(() => ({
  isSpeaking: true,
}));

vi.mock("./providers", () => ({
  useAnnotation: () => ({
    handleToggleBookmark: vi.fn(),
    isCurrentBookmarked: false,
  }),
  useBookData: () => ({
    book: { title: "测试书名" },
  }),
  useNavigation: () => ({
    handleBack: vi.fn(),
  }),
  useReaderUI: () => ({
    isFullscreen: false,
    openToc: vi.fn(),
    setSettingsOpen: vi.fn(),
    toggleFullscreen: vi.fn(),
    toolbarVisible: true,
  }),
  useTts: () => ({
    isSpeaking: toolbarState.isSpeaking,
    openTtsPlayer: vi.fn(),
  }),
}));

describe("ReaderToolbar", () => {
  it("keeps the TTS entry button visually neutral while speaking", () => {
    render(<ReaderToolbar />);

    const ttsButton = screen.getByLabelText("打开播放器");

    expect(ttsButton).toHaveClass("text-[var(--reader-text)]/60");
    expect(ttsButton).not.toHaveClass("bg-[var(--reader-text)]");
    expect(ttsButton).not.toHaveClass("text-[var(--reader-card-bg)]");
  });
});
