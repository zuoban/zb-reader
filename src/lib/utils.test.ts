import { afterEach, describe, expect, it, vi } from "vitest";
import { cn, debounce } from "@/lib/utils";

describe("cn utility", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    expect(cn("base", true && "included", false && "excluded")).toBe(
      "base included"
    );
  });

  it("merges tailwind classes correctly", () => {
    expect(cn("px-4", "px-2")).toBe("px-2");
  });

  it("handles undefined and null", () => {
    expect(cn("base", undefined, null, "end")).toBe("base end");
  });

  it("handles object notation", () => {
    expect(cn({ active: true, disabled: false })).toBe("active");
  });
});

describe("debounce utility", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("runs only the latest call after the delay", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const debounced = debounce(fn, 400);

    debounced("first");
    debounced("second");
    vi.advanceTimersByTime(399);

    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("second");
  });

  it("can cancel a pending call", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const debounced = debounce(fn, 400);

    debounced("pending");
    debounced.cancel();
    vi.advanceTimersByTime(400);

    expect(fn).not.toHaveBeenCalled();
  });
});
