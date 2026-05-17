"use client";

import { useCallback } from "react";
import { ttsAudioCache, TtsAudioLruCache } from "@/lib/ttsAudioCache";

const BROWSER_TTS_CACHE_NAME = "zb-reader-builtin-tts-v1";

interface BuiltinTtsAudioParams {
  text: string;
  voiceName: string;
  rate: number;
  pitch: number;
  volume: number;
}

interface BuiltinTtsErrorResponse {
  error?: string;
  details?: string;
}

function createAudioObjectUrl(blob: Blob) {
  return URL.createObjectURL(blob);
}

function createBrowserCacheRequest(cacheKey: string) {
  const baseUrl =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "http://localhost";
  return new Request(`${baseUrl}/api/tts/builtin/prepare?cacheKey=${encodeURIComponent(cacheKey)}`);
}

async function getBrowserCachedBuiltinTtsBlob(cacheKey: string) {
  if (typeof caches === "undefined") return null;

  try {
    const cache = await caches.open(BROWSER_TTS_CACHE_NAME);
    const response = await cache.match(createBrowserCacheRequest(cacheKey));
    if (!response?.ok) return null;
    return response.blob();
  } catch {
    return null;
  }
}

async function setBrowserCachedBuiltinTtsBlob(cacheKey: string, response: Response) {
  if (typeof caches === "undefined") return;

  try {
    const cache = await caches.open(BROWSER_TTS_CACHE_NAME);
    await cache.put(createBrowserCacheRequest(cacheKey), response.clone());
  } catch {
    // Cache API can fail in private browsing or storage pressure; memory cache still covers this session.
  }
}

async function parseBuiltinTtsError(res: Response) {
  const data = (await res.json().catch(() => null)) as BuiltinTtsErrorResponse | null;
  const message = data?.error || "朗读失败";
  const details = data?.details ? `: ${data.details}` : "";
  return `${message}${details}`;
}

async function fetchBuiltinTtsAudioWithRetry(
  params: BuiltinTtsAudioParams,
  cacheKey: string,
  signal?: AbortSignal,
  maxRetries = 3
) {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch("/api/tts/builtin/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: params.text,
          voiceName: params.voiceName,
          rate: params.rate,
          pitch: params.pitch,
          volume: params.volume,
        }),
        signal,
      });

      if (!res.ok) {
        throw new Error(await parseBuiltinTtsError(res));
      }

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.startsWith("audio/") && !contentType.includes("application/octet-stream")) {
        throw new Error("朗读失败: 返回内容不是音频");
      }

      const cacheResponse = res.clone();
      const blob = await res.blob();
      if (blob.size === 0) {
        throw new Error("朗读失败: 音频为空");
      }

      await setBrowserCachedBuiltinTtsBlob(cacheKey, cacheResponse);
      ttsAudioCache.set(cacheKey, { kind: "blob", blob });
      return createAudioObjectUrl(blob);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") throw err;
      lastError = err as Error;
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 500;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError || new Error("朗读生成失败");
}

export function useBuiltinTtsSpeech(selectedVoiceId: string, ttsRate: number) {
  return useCallback(
    async (
      text: string,
      options?: { prefetch?: boolean; signal?: AbortSignal; bypassCache?: boolean }
    ) => {
      const ratePercent = Math.round((ttsRate - 1) * 100);

      const cacheKey = TtsAudioLruCache.hashKey({
        engine: "builtin",
        text,
        voiceName: selectedVoiceId,
        rate: ratePercent,
        pitch: 0,
        volume: 100,
      });

      if (!options?.bypassCache) {
        const cached = ttsAudioCache.get(cacheKey);
        if (cached?.kind === "url") {
          return cached.audioUrl;
        }
        if (cached?.kind === "blob") {
          return createAudioObjectUrl(cached.blob);
        }

        const browserCachedBlob = await getBrowserCachedBuiltinTtsBlob(cacheKey);
        if (browserCachedBlob) {
          ttsAudioCache.set(cacheKey, { kind: "blob", blob: browserCachedBlob });
          return createAudioObjectUrl(browserCachedBlob);
        }
      }

      return fetchBuiltinTtsAudioWithRetry(
        {
          text,
          voiceName: selectedVoiceId,
          rate: ratePercent,
          pitch: 0,
          volume: 100,
        },
        cacheKey,
        options?.signal
      );
    },
    [selectedVoiceId, ttsRate]
  );
}
