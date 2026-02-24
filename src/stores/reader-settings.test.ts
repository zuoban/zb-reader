import { describe, it, expect, beforeEach, vi } from "vitest";
import { act } from "@testing-library/react";
import { useReaderSettingsStore } from "@/stores/reader-settings";

vi.mock("zustand/middleware", () => ({
  devtools: (fn: unknown) => fn,
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("useReaderSettingsStore", () => {
  beforeEach(() => {
    useReaderSettingsStore.setState({
      fontSize: 16,
      theme: "light",
      ttsEngine: "browser",
      browserVoiceId: "",
      ttsRate: 1,
      ttsPitch: 1,
      ttsVolume: 1,
      microsoftPreloadCount: 3,
      legadoRate: 50,
      legadoConfigId: "",
      legadoPreloadCount: 3,
      ttsImmersiveMode: false,
      loaded: false,
    });
    mockFetch.mockReset();
  });

  describe("setters with validation", () => {
    it("clamps fontSize between 12 and 28", () => {
      act(() => {
        useReaderSettingsStore.getState().setFontSize(5);
      });
      expect(useReaderSettingsStore.getState().fontSize).toBe(12);

      act(() => {
        useReaderSettingsStore.getState().setFontSize(50);
      });
      expect(useReaderSettingsStore.getState().fontSize).toBe(28);

      act(() => {
        useReaderSettingsStore.getState().setFontSize(18);
      });
      expect(useReaderSettingsStore.getState().fontSize).toBe(18);
    });

    it("clamps ttsRate between 1 and 5", () => {
      act(() => {
        useReaderSettingsStore.getState().setTtsRate(0.5);
      });
      expect(useReaderSettingsStore.getState().ttsRate).toBe(1);

      act(() => {
        useReaderSettingsStore.getState().setTtsRate(10);
      });
      expect(useReaderSettingsStore.getState().ttsRate).toBe(5);
    });

    it("clamps ttsPitch between 0.5 and 2", () => {
      act(() => {
        useReaderSettingsStore.getState().setTtsPitch(0.1);
      });
      expect(useReaderSettingsStore.getState().ttsPitch).toBe(0.5);

      act(() => {
        useReaderSettingsStore.getState().setTtsPitch(3);
      });
      expect(useReaderSettingsStore.getState().ttsPitch).toBe(2);
    });

    it("clamps ttsVolume between 0 and 1", () => {
      act(() => {
        useReaderSettingsStore.getState().setTtsVolume(-0.5);
      });
      expect(useReaderSettingsStore.getState().ttsVolume).toBe(0);

      act(() => {
        useReaderSettingsStore.getState().setTtsVolume(1.5);
      });
      expect(useReaderSettingsStore.getState().ttsVolume).toBe(1);
    });

    it("validates microsoftPreloadCount to allowed values", () => {
      act(() => {
        useReaderSettingsStore.getState().setMicrosoftPreloadCount(4);
      });
      expect(useReaderSettingsStore.getState().microsoftPreloadCount).toBe(3);

      act(() => {
        useReaderSettingsStore.getState().setMicrosoftPreloadCount(5);
      });
      expect(useReaderSettingsStore.getState().microsoftPreloadCount).toBe(5);
    });
  });

  describe("loadFromServer", () => {
    it("loads settings from API response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          settings: {
            fontSize: 20,
            theme: "dark",
            ttsRate: 1.5,
          },
        }),
      });

      await act(async () => {
        await useReaderSettingsStore.getState().loadFromServer();
      });

      const state = useReaderSettingsStore.getState();
      expect(state.fontSize).toBe(20);
      expect(state.theme).toBe("dark");
      expect(state.ttsRate).toBe(1.5);
      expect(state.loaded).toBe(true);
    });

    it("handles API errors gracefully", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });

      await act(async () => {
        await useReaderSettingsStore.getState().loadFromServer();
      });

      expect(useReaderSettingsStore.getState().loaded).toBe(false);
    });
  });

  describe("saveToServer", () => {
    it("does not save if not loaded", async () => {
      await act(async () => {
        await useReaderSettingsStore.getState().saveToServer();
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("saves to API when loaded", async () => {
      useReaderSettingsStore.setState({ loaded: true, fontSize: 18 });

      mockFetch.mockResolvedValueOnce({ ok: true });

      await act(async () => {
        await useReaderSettingsStore.getState().saveToServer();
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/reader-settings",
        expect.objectContaining({
          method: "PUT",
          headers: { "Content-Type": "application/json" },
        })
      );
    });
  });
});
