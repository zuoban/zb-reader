import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useReaderBookData } from "./useReaderBookData";

const cacheBook = vi.fn();
const getCachedBook = vi.fn();
const getLocalProgress = vi.fn();
const onMissingBook = vi.fn();
const onProgressLoaded = vi.fn();

vi.mock("@/lib/book-cache", () => ({
  cacheBook: (...args: unknown[]) => cacheBook(...args),
  getCachedBook: (...args: unknown[]) => getCachedBook(...args),
}));

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
    cacheBook.mockResolvedValue(undefined);
    global.fetch = vi.fn();
  });

  it("uses the cached ArrayBuffer when available", async () => {
    const cachedBook = new ArrayBuffer(8);
    getCachedBook.mockResolvedValue(cachedBook);
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

    expect(result.current.bookData).toBe(cachedBook);
    expect(result.current.bookUrl).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("opens the proxy URL immediately while downloading and caching a missing book in the background", async () => {
    const downloadedBook = new ArrayBuffer(16);
    let resolveDownload: (response: Response) => void = () => {};
    const downloadPromise = new Promise<Response>((resolve) => {
      resolveDownload = resolve;
    });

    getCachedBook.mockResolvedValue(null);
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          book,
          progress: null,
          bookmarks: [],
          notes: [],
        }),
      } as Response)
      .mockReturnValueOnce(downloadPromise);

    const { result } = renderHook(() =>
      useReaderBookData({ bookId: book.id, onMissingBook, onProgressLoaded })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.bookUrl).toBe(`/api/books/${book.id}/proxy/`);
    expect(result.current.bookData).toBeNull();

    resolveDownload({
      ok: true,
      arrayBuffer: async () => downloadedBook,
    } as Response);

    await waitFor(() => expect(cacheBook).toHaveBeenCalledWith(book.id, downloadedBook));
    expect(result.current.bookUrl).toBe(`/api/books/${book.id}/proxy/`);
  });

  it("handles download failure gracefully without crashing", async () => {
    getCachedBook.mockResolvedValue(null);
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          book,
          progress: null,
          bookmarks: [],
          notes: [],
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

    const { result } = renderHook(() =>
      useReaderBookData({ bookId: book.id, onMissingBook, onProgressLoaded })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.bookUrl).toBe(`/api/books/${book.id}/proxy/`);
    // Should not crash, bookUrl stays as proxy
    await waitFor(() => expect(result.current.bookUrl).toBe(`/api/books/${book.id}/proxy/`));
  });
});
