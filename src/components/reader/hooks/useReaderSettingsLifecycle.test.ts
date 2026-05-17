import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useReaderSettingsLifecycle } from "./useReaderSettingsLifecycle";

const baseSettings = {
  fontSize: 16,
  theme: "light" as const,
  fontFamily: "system" as const,
  ttsVoiceId: "",
  ttsRate: 1,
  ttsPitch: 1,
  ttsVolume: 1,
  ttsPreloadCount: 5,
  ttsHighlightColor: "#3b82f6",
  autoScrollToActive: true,
  ttsImmersiveMode: false,
  ttsHighlightStyle: "background" as const,
  loaded: true,
  loadFromServer: vi.fn(),
  setTtsVoiceId: vi.fn(),
};

describe("useReaderSettingsLifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("does not fetch Microsoft voices during initial settings load", async () => {
    renderHook(() => useReaderSettingsLifecycle(baseSettings, vi.fn()));

    await waitFor(() => expect(baseSettings.loadFromServer).toHaveBeenCalled());

    expect(fetch).not.toHaveBeenCalledWith("/api/tts/microsoft/voices");
  });

  it("loads Microsoft voices on demand and selects the first voice when none is selected", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        voices: [
          { id: "voice-1", name: "晓晓", locale: "zh-CN" },
          { id: "voice-2", name: "云希", locale: "zh-CN" },
        ],
      }),
    } as Response);

    const { result } = renderHook(() =>
      useReaderSettingsLifecycle(baseSettings, vi.fn())
    );

    await act(async () => {
      await result.current.loadTtsVoices();
    });

    expect(fetch).toHaveBeenCalledWith("/api/tts/microsoft/voices");
    await waitFor(() =>
      expect(result.current.ttsVoices).toEqual([
        { id: "voice-1", name: "晓晓", locale: "zh-CN" },
        { id: "voice-2", name: "云希", locale: "zh-CN" },
      ])
    );
    expect(baseSettings.setTtsVoiceId).toHaveBeenCalledWith("voice-1");
  });

  it("does not fetch voices again if already loaded (deduplication via ref)", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        voices: [{ id: "voice-1", name: "晓晓", locale: "zh-CN" }],
      }),
    } as Response);

    const { result } = renderHook(() =>
      useReaderSettingsLifecycle(baseSettings, vi.fn())
    );

    // First call triggers fetch
    await act(async () => {
      await result.current.loadTtsVoices();
    });

    expect(fetch).toHaveBeenCalledTimes(1);

    // Second call should NOT trigger another fetch
    await act(async () => {
      await result.current.loadTtsVoices();
    });

    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
