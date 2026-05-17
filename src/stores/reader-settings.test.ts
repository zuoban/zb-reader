import { toast as mockToast } from "sonner";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { act } from "@testing-library/react";
import { useReaderSettingsStore } from "@/stores/reader-settings";

vi.mock("zustand/middleware", () => ({
  devtools: (fn: unknown) => fn,
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("useReaderSettingsStore", () => {
  beforeEach(() => {
    useReaderSettingsStore.setState({
      fontSize: 16,
      theme: "light",
      ttsVoiceId: "",
      ttsRate: 1,
      ttsPitch: 1,
      ttsVolume: 1,
      ttsPreloadCount: 5,
      loaded: false,
    });
    mockFetch.mockReset();
    vi.mocked(mockToast.error).mockClear();
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

    it("validates ttsPreloadCount to allowed values", () => {
      act(() => {
        useReaderSettingsStore.getState().setTtsPreloadCount(4);
      });
      expect(useReaderSettingsStore.getState().ttsPreloadCount).toBe(5);

      act(() => {
        useReaderSettingsStore.getState().setTtsPreloadCount(8);
      });
      expect(useReaderSettingsStore.getState().ttsPreloadCount).toBe(8);
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
      useReaderSettingsStore.setState({
        loaded: true,
        fontSize: 18,
        ttsVoiceId: "zh-CN-XiaoxiaoNeural",
      });

      mockFetch.mockResolvedValueOnce({ ok: true });

      await act(async () => {
        await useReaderSettingsStore.getState().saveToServer();
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/reader-settings",
        expect.objectContaining({
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: expect.stringContaining('"browserVoiceId":"zh-CN-XiaoxiaoNeural"'),
        })
      );
    });

    it("does not save removed TTS auto-next setting", async () => {
      useReaderSettingsStore.setState({
        loaded: true,
      });

      mockFetch.mockResolvedValueOnce({ ok: true });

      await act(async () => {
        await useReaderSettingsStore.getState().saveToServer();
      });

      const [, init] = mockFetch.mock.calls[0];
      expect(JSON.parse(init.body)).not.toHaveProperty("ttsAutoNextChapter");
    });

    it("does not show toast on 401 (session expired)", async () => {
      useReaderSettingsStore.setState({ loaded: true });
      mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });

      await act(async () => {
        await useReaderSettingsStore.getState().saveToServer();
      });

      expect(mockToast.error).not.toHaveBeenCalled();
    });

    it("shows error toast on server error", async () => {
      useReaderSettingsStore.setState({ loaded: true });
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500, text: async () => "Internal Error" });

      await act(async () => {
        await useReaderSettingsStore.getState().saveToServer();
      });

      expect(mockToast.error).toHaveBeenCalledWith("设置保存失败，请稍后重试");
    });

    it("shows error toast on network failure", async () => {
      useReaderSettingsStore.setState({ loaded: true });
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await act(async () => {
        await useReaderSettingsStore.getState().saveToServer();
      });

      expect(mockToast.error).toHaveBeenCalledWith("设置保存失败，请检查网络连接");
    });
  });
});
