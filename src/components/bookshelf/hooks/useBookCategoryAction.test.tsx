import { act, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { useBookCategoryAction } from "./useBookCategoryAction";
import { createMockBook } from "@/components/bookshelf/test-utils";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

type HookValue = ReturnType<typeof useBookCategoryAction>;

function renderHookHarness(onSaved = vi.fn()) {
  const values: { current: HookValue | null } = { current: null };

  function Harness() {
    values.current = useBookCategoryAction({ onSaved });
    return null;
  }

  const result = render(<Harness />);
  return { ...result, onSaved, values };
}

describe("useBookCategoryAction", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("opens the dialog with the book's current category", () => {
    const { values } = renderHookHarness();

    act(() => {
      values.current?.openCategoryDialog(createMockBook({ category: "小说" }));
    });

    expect(values.current?.categoryDialogBook?.id).toBe("book-1");
    expect(values.current?.categoryInput).toBe("小说");
  });

  it("clears state when the dialog closes", () => {
    const { values } = renderHookHarness();

    act(() => {
      values.current?.openCategoryDialog(createMockBook());
      values.current?.handleCategoryDialogOpenChange(false);
    });

    expect(values.current?.categoryDialogBook).toBeNull();
    expect(values.current?.categoryInput).toBe("");
  });

  it("rejects categories over 40 characters without sending a request", async () => {
    const { values, onSaved } = renderHookHarness();

    act(() => {
      values.current?.openCategoryDialog(createMockBook());
      values.current?.setCategoryInput("a".repeat(41));
    });
    await act(async () => {
      await values.current?.saveCategory();
    });

    expect(fetch).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("分类名称不能超过 40 个字符");
  });

  it("saves an empty category to clear the category", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }));
    const onSaved = vi.fn();
    const { values } = renderHookHarness(onSaved);

    act(() => {
      values.current?.openCategoryDialog(createMockBook());
      values.current?.setCategoryInput("   ");
    });
    await act(async () => {
      await values.current?.saveCategory();
    });

    expect(fetch).toHaveBeenCalledWith("/api/books/book-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: "" }),
    });
    expect(onSaved).toHaveBeenCalledOnce();
    expect(values.current?.categoryDialogBook).toBeNull();
    expect(values.current?.categoryInput).toBe("");
    expect(toast.success).toHaveBeenCalledWith("分类已清除");
  });

  it("saves a trimmed category and refreshes the bookshelf", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }));
    const onSaved = vi.fn();
    const { values } = renderHookHarness(onSaved);

    act(() => {
      values.current?.openCategoryDialog(createMockBook());
      values.current?.setCategoryInput(" 技术 ");
    });
    await act(async () => {
      await values.current?.saveCategory();
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/books/book-1",
      expect.objectContaining({
        body: JSON.stringify({ category: "技术" }),
      })
    );
    expect(onSaved).toHaveBeenCalledOnce();
    expect(toast.success).toHaveBeenCalledWith("分类已更新");
  });

  it("keeps the dialog open and shows an error when saving fails", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 500 }));
    const onSaved = vi.fn();
    const { values } = renderHookHarness(onSaved);

    act(() => {
      values.current?.openCategoryDialog(createMockBook());
      values.current?.setCategoryInput("历史");
    });
    await act(async () => {
      await values.current?.saveCategory();
    });

    expect(onSaved).not.toHaveBeenCalled();
    expect(values.current?.categoryDialogBook?.id).toBe("book-1");
    expect(values.current?.categoryInput).toBe("历史");
    expect(toast.error).toHaveBeenCalledWith("分类保存失败");
  });
});
