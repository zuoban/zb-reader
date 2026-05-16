import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useReaderBookData } from "./useReaderBookData";

const getLocalProgress = vi.fn();
const onMissingBook = vi.fn();
const onProgressLoaded = vi.fn();

vi.mock("@/lib/local-progress", () => ({
  getLocalProgressManager: () => ({
    getLocalProgress,
  }),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

const book = {
  id: "book-1",
  title: "测试书籍",
  author: "作者",
  format: "epub",
};

describe("useReaderBookData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getLocalProgress.mockResolvedValue(null);
    global.fetch = vi.fn();
  });

  it("uses the proxy URL for reading", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        book,
        progress: null,
        bookmarks: [],
        notes: [],
      }),
    } as Response);

    const { result } = renderHook(() =>
      useReaderBookData({ bookId: book.id, onMissingBook, onProgressLoaded })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.bookData).toBeNull();
    expect(result.current.bookUrl).toBe(`/api/books/${book.id}/proxy/`);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("keeps the proxy URL as the only reading source", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        book,
        progress: null,
        bookmarks: [],
        notes: [],
      }),
    } as Response);

    const { result } = renderHook(() =>
      useReaderBookData({ bookId: book.id, onMissingBook, onProgressLoaded })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.bookUrl).toBe(`/api/books/${book.id}/proxy/`);
    expect(result.current.bookData).toBeNull();
  });
});
