import { describe, it, expect, beforeEach, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useTtsFloatingStore } from "@/stores/tts-floating";

vi.mock("zustand/middleware", () => ({
  devtools: (fn: unknown) => fn,
  persist: (fn: unknown) => fn,
}));

describe("useTtsFloatingStore", () => {
  beforeEach(() => {
    useTtsFloatingStore.setState({ position: { x: 16, y: 80 } });
  });

  it("has default position", () => {
    const { position } = useTtsFloatingStore.getState();
    expect(position).toEqual({ x: 16, y: 80 });
  });

  it("updates position with setPosition", () => {
    act(() => {
      useTtsFloatingStore.getState().setPosition({ x: 100, y: 200 });
    });

    const { position } = useTtsFloatingStore.getState();
    expect(position).toEqual({ x: 100, y: 200 });
  });

  it("provides position via hook selector", () => {
    const { result } = renderHook(() =>
      useTtsFloatingStore((s) => s.position)
    );

    expect(result.current).toEqual({ x: 16, y: 80 });

    act(() => {
      useTtsFloatingStore.getState().setPosition({ x: 50, y: 100 });
    });

    expect(result.current).toEqual({ x: 50, y: 100 });
  });
});
