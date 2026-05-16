import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ALL_CATEGORY, UNCATEGORIZED_CATEGORY, useBookshelfData } from "./useBookshelfData";
import { createBookshelfInitialData, createMockBook } from "@/components/bookshelf/test-utils";

type HookValue = ReturnType<typeof useBookshelfData>;

function renderHookHarness(initialData = createBookshelfInitialData()) {
  const values: { current: HookValue | null } = { current: null };

  function Harness() {
    values.current = useBookshelfData(initialData);
    return null;
  }

  const result = render(<Harness />);
  return { ...result, values };
}

function mockBooksResponse(payload: unknown, options?: { hold?: boolean }) {
  if (options?.hold) {
    return new Promise<Response>(() => undefined);
  }

  return Promise.resolve(
    new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  );
}

function getRequestUrl(callIndex = 0) {
  const input = vi.mocked(fetch).mock.calls[callIndex]?.[0];
  expect(typeof input).toBe("string");
  return new URL(input as string, "http://localhost");
}

describe("useBookshelfData", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("exposes initial bookshelf data", () => {
    const { values } = renderHookHarness();

    expect(values.current?.books).toHaveLength(1);
    expect(values.current?.categories).toEqual([{ name: "技术", count: 1 }]);
    expect(values.current?.progressMap).toEqual({ "book-1": 0.2 });
    expect(values.current?.lastReadAtMap).toEqual({ "book-1": "2026-05-10T01:00:00.000Z" });
    expect(values.current?.selectedCategory).toBe(ALL_CATEGORY);
    expect(values.current?.totalBooks).toBe(1);
  });

  it("refreshes with current category and search params", async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockBooksResponse({
        books: [createMockBook({ id: "book-2" })],
        categories: [{ name: "技术", count: 1 }],
        progressMap: { "book-2": 0.4 },
        lastReadAtMap: { "book-2": "2026-05-10T02:00:00.000Z" },
        total: 1,
        allTotal: 1,
      }) as never
    );
    const { values } = renderHookHarness();

    act(() => {
      values.current?.setSelectedCategory("技术");
      values.current?.setSearchQuery("React");
    });

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    const url = getRequestUrl();

    expect(url.pathname).toBe("/api/books");
    expect(url.searchParams.get("page")).toBe("1");
    expect(url.searchParams.get("includeFacets")).toBe("true");
    expect(url.searchParams.get("category")).toBe("技术");
    expect(url.searchParams.get("search")).toBe("React");
    await waitFor(() => expect(values.current?.books[0]?.id).toBe("book-2"));
  });

  it("requests the uncategorized category token and exposes a readable active name", async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockBooksResponse({
        books: [createMockBook({ id: "book-2", category: null })],
        categories: [{ name: "技术", count: 1 }],
        progressMap: {},
        lastReadAtMap: {},
        total: 1,
        allTotal: 2,
      }) as never
    );
    const { values } = renderHookHarness();

    act(() => {
      values.current?.setSelectedCategory(UNCATEGORIZED_CATEGORY);
    });

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    const url = getRequestUrl();

    expect(values.current?.activeCategoryName).toBe("未分类");
    expect(url.searchParams.get("category")).toBe(UNCATEGORIZED_CATEGORY);
  });

  it("appends books and maps when loading more", async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockBooksResponse({
        books: [createMockBook({ id: "book-2" })],
        progressMap: { "book-2": 0.8 },
        lastReadAtMap: { "book-2": "2026-05-10T02:00:00.000Z" },
        total: 2,
      }) as never
    );
    const { values } = renderHookHarness(createBookshelfInitialData({ total: 2, allTotal: 2 }));

    act(() => {
      values.current?.handleLoadMore();
    });

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    const url = getRequestUrl();
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.get("includeFacets")).toBe("false");
    await waitFor(() => expect(values.current?.books.map((book) => book.id)).toEqual(["book-1", "book-2"]));
    expect(values.current?.progressMap).toMatchObject({ "book-1": 0.2, "book-2": 0.8 });
    expect(values.current?.lastReadAtMap).toMatchObject({
      "book-1": "2026-05-10T01:00:00.000Z",
      "book-2": "2026-05-10T02:00:00.000Z",
    });
  });

  it("aborts an in-flight first-page request before starting another refresh", async () => {
    vi.mocked(fetch)
      .mockImplementationOnce((_input, init) => {
        expect((init as RequestInit).signal).toBeInstanceOf(AbortSignal);
        return mockBooksResponse({}, { hold: true });
      })
      .mockResolvedValue(
        mockBooksResponse({
          books: [],
          categories: [],
          total: 0,
          allTotal: 0,
        }) as never
      );
    const { values } = renderHookHarness();

    let firstRefresh: Promise<void> | undefined;
    await act(async () => {
      firstRefresh = values.current?.refreshBooks();
    });
    const firstSignal = vi.mocked(fetch).mock.calls[0]?.[1]?.signal as AbortSignal;

    await act(async () => {
      await values.current?.refreshBooks();
    });

    expect(firstRefresh).toBeDefined();
    expect(firstSignal.aborted).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("removes a book and its related maps", () => {
    const { values } = renderHookHarness();

    act(() => {
      values.current?.removeBook("book-1");
    });

    expect(values.current?.books).toEqual([]);
    expect(values.current?.progressMap).toEqual({});
    expect(values.current?.lastReadAtMap).toEqual({});
  });
});
