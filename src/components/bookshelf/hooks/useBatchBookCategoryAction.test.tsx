import { act, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { useBatchBookCategoryAction } from "./useBatchBookCategoryAction";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

type HookValue = ReturnType<typeof useBatchBookCategoryAction>;

function renderHookHarness(onSaved = vi.fn()) {
  const values: { current: HookValue | null } = { current: null };

  function Harness() {
    values.current = useBatchBookCategoryAction({ onSaved });
    return null;
  }

  const result = render(<Harness />);
  return { ...result, onSaved, values };
}

describe("useBatchBookCategoryAction", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("opens the dialog with selected book ids", () => {
    const { values } = renderHookHarness();

    act(() => {
      values.current?.openBatchCategoryDialog(["book-1", "book-2"]);
    });

    expect(values.current?.batchCategoryDialogOpen).toBe(true);
    expect(values.current?.selectedBookIds).toEqual(["book-1", "book-2"]);
    expect(values.current?.batchCategoryInput).toBe("");
  });

  it("rejects categories over 40 characters without sending a request", async () => {
    const { values, onSaved } = renderHookHarness();

    act(() => {
      values.current?.openBatchCategoryDialog(["book-1"]);
      values.current?.setBatchCategoryInput("a".repeat(41));
    });
    await act(async () => {
      await values.current?.saveBatchCategory();
    });

    expect(fetch).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("分类名称不能超过 40 个字符");
  });

  it("saves a trimmed category and clears selection", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ updatedCount: 2, category: "技术" }), { status: 200 }));
    const onSaved = vi.fn();
    const { values } = renderHookHarness(onSaved);

    act(() => {
      values.current?.openBatchCategoryDialog(["book-1", "book-2"]);
      values.current?.setBatchCategoryInput(" 技术 ");
    });
    await act(async () => {
      await values.current?.saveBatchCategory();
    });

    expect(fetch).toHaveBeenCalledWith("/api/books/batch-category", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookIds: ["book-1", "book-2"], category: "技术" }),
    });
    expect(onSaved).toHaveBeenCalledOnce();
    expect(values.current?.batchCategoryDialogOpen).toBe(false);
    expect(values.current?.selectedBookIds).toEqual([]);
    expect(toast.success).toHaveBeenCalledWith("已更新 2 本书的分类");
  });

  it("saves a blank category to clear selected books", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ updatedCount: 2, category: null }), { status: 200 }));
    const { values } = renderHookHarness();

    act(() => {
      values.current?.openBatchCategoryDialog(["book-1", "book-2"]);
      values.current?.setBatchCategoryInput("   ");
    });
    await act(async () => {
      await values.current?.saveBatchCategory();
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/books/batch-category",
      expect.objectContaining({
        body: JSON.stringify({ bookIds: ["book-1", "book-2"], category: "" }),
      })
    );
    expect(toast.success).toHaveBeenCalledWith("已清除 2 本书的分类");
  });

  it("keeps the dialog open when saving fails", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ error: "分类保存失败" }), { status: 500 }));
    const onSaved = vi.fn();
    const { values } = renderHookHarness(onSaved);

    act(() => {
      values.current?.openBatchCategoryDialog(["book-1"]);
      values.current?.setBatchCategoryInput("历史");
    });
    await act(async () => {
      await values.current?.saveBatchCategory();
    });

    expect(onSaved).not.toHaveBeenCalled();
    expect(values.current?.batchCategoryDialogOpen).toBe(true);
    expect(values.current?.selectedBookIds).toEqual(["book-1"]);
    expect(toast.error).toHaveBeenCalledWith("分类保存失败");
  });
});
