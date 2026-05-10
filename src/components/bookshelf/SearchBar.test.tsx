import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SearchBar } from "@/components/bookshelf/SearchBar";

describe("SearchBar", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("debounces search input", () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />);

    fireEvent.change(screen.getByPlaceholderText("搜索书名或作者..."), {
      target: { value: "React" },
    });

    expect(onSearch).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(399);
    });
    expect(onSearch).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onSearch).toHaveBeenCalledWith("React");
  });

  it("clears pending search and immediately emits an empty query", () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />);

    fireEvent.change(screen.getByPlaceholderText("搜索书名或作者..."), {
      target: { value: "React" },
    });
    fireEvent.click(screen.getByRole("button"));

    expect(onSearch).toHaveBeenCalledWith("");
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(screen.getByPlaceholderText("搜索书名或作者...")).toHaveValue("");
  });

  it("cancels pending search on unmount", () => {
    const onSearch = vi.fn();
    const { unmount } = render(<SearchBar onSearch={onSearch} />);

    fireEvent.change(screen.getByPlaceholderText("搜索书名或作者..."), {
      target: { value: "React" },
    });
    unmount();
    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(onSearch).not.toHaveBeenCalled();
  });
});
