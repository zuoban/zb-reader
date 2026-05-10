import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { useBookDeleteAction } from "./useBookDeleteAction";
import { createMockBook } from "@/components/bookshelf/test-utils";
import type { Book } from "@/lib/db/schema";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

type HookValue = ReturnType<typeof useBookDeleteAction>;

function renderHookHarness(options?: {
  books?: Book[];
  onDeleted?: (bookId: string) => void;
}) {
  const values: { current: HookValue | null } = { current: null };
  const onDeleted = options?.onDeleted ?? vi.fn();
  const books = options?.books ?? [createMockBook({ id: "book-1" })];

  function Harness() {
    values.current = useBookDeleteAction({ books, onDeleted });
    return null;
  }

  const result = render(<Harness />);
  return { ...result, onDeleted, values };
}

describe("useBookDeleteAction", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("opens the delete dialog for an existing book", () => {
    const { values } = renderHookHarness();

    act(() => {
      values.current?.requestDelete("book-1");
    });

    expect(values.current?.deleteDialogBook?.id).toBe("book-1");
  });

  it("does not open the delete dialog for an unknown book", () => {
    const { values } = renderHookHarness();

    act(() => {
      values.current?.requestDelete("missing-book");
    });

    expect(values.current?.deleteDialogBook).toBeNull();
  });

  it("deletes the selected book and reports success", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }));
    const onDeleted = vi.fn();
    const { values } = renderHookHarness({ onDeleted });

    act(() => {
      values.current?.requestDelete("book-1");
    });
    await act(async () => {
      await values.current?.confirmDelete();
    });

    expect(fetch).toHaveBeenCalledWith("/api/books/book-1", { method: "DELETE" });
    expect(onDeleted).toHaveBeenCalledWith("book-1");
    expect(values.current?.deleteDialogBook).toBeNull();
    expect(toast.success).toHaveBeenCalledWith("删除成功");
  });

  it("shows an error when delete fails", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 500 }));
    const onDeleted = vi.fn();
    const { values } = renderHookHarness({ onDeleted });

    act(() => {
      values.current?.requestDelete("book-1");
    });
    await act(async () => {
      await values.current?.confirmDelete();
    });

    expect(onDeleted).not.toHaveBeenCalled();
    expect(values.current?.deleteDialogBook?.id).toBe("book-1");
    expect(toast.error).toHaveBeenCalledWith("删除失败");
  });

  it("keeps the dialog open while deletion is in progress", async () => {
    vi.mocked(fetch).mockReturnValue(new Promise<Response>(() => undefined));
    const { values } = renderHookHarness();

    act(() => {
      values.current?.requestDelete("book-1");
    });
    void act(() => {
      void values.current?.confirmDelete();
    });
    await waitFor(() => expect(values.current?.deletingBook).toBe(true));

    act(() => {
      values.current?.handleDeleteDialogOpenChange(false);
    });

    expect(values.current?.deleteDialogBook?.id).toBe("book-1");
  });
});
