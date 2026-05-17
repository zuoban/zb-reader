import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useBuiltinTtsSpeech } from "./useBuiltinTtsSpeech";

class MemoryCache {
  private map = new Map<string, Response>();

  async match(request: Request) {
    const response = this.map.get(request.url);
    return response ? response.clone() : undefined;
  }

  async put(request: Request, response: Response) {
    this.map.set(request.url, response.clone());
  }
}

describe("useBuiltinTtsSpeech", () => {
  const objectUrls: string[] = [];
  let memoryCache: MemoryCache;

  beforeEach(() => {
    vi.restoreAllMocks();
    objectUrls.length = 0;
    memoryCache = new MemoryCache();

    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal("caches", {
      open: vi.fn(async () => memoryCache),
    });
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn((blob: Blob) => {
        const url = `blob:tts-${objectUrls.length}-${blob.size}`;
        objectUrls.push(url);
        return url;
      }),
    });
  });

  it("stores prefetched builtin TTS audio in the browser cache and reuses it for playback", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      new Response("audio", {
        status: 200,
        headers: { "content-type": "audio/mpeg" },
      })
    );

    const { result } = renderHook(() => useBuiltinTtsSpeech("voice-a", 1.25));

    let prefetchedUrl = "";
    await act(async () => {
      prefetchedUrl = await result.current("你好", { prefetch: true });
    });

    let playbackUrl = "";
    await act(async () => {
      playbackUrl = await result.current("你好");
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(prefetchedUrl).toMatch(/^blob:tts-/);
    expect(playbackUrl).toMatch(/^blob:tts-/);
    expect(playbackUrl).not.toBe(prefetchedUrl);
    expect(caches.open).toHaveBeenCalledWith("zb-reader-builtin-tts-v1");
  });
});
