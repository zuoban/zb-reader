"use client";

import { useCallback } from "react";
import { ttsAudioCache, TtsAudioLruCache } from "@/lib/ttsAudioCache";

interface MicrosoftTtsAudioParams {
  text: string;
  voiceName: string;
  rate: number;
  pitch: number;
  volume: number;
  prefetch?: boolean;
}

function buildMicrosoftTtsAudioUrl(params: MicrosoftTtsAudioParams) {
  const searchParams = new URLSearchParams({
    text: params.text,
    voiceName: params.voiceName,
    rate: String(params.rate),
    pitch: String(params.pitch),
    volume: String(params.volume),
  });

  if (params.prefetch) {
    searchParams.set("prefetch", "1");
  }

  return `/api/tts/microsoft?${searchParams.toString()}`;
}

export function useMicrosoftTtsSpeech(selectedBrowserVoiceId: string, ttsRate: number) {
  return useCallback(
    async (text: string, options?: { prefetch?: boolean }) => {
      const ratePercent = Math.round((ttsRate - 1) * 100);

      const cacheKey = TtsAudioLruCache.hashKey({
        engine: "microsoft",
        text,
        voiceName: selectedBrowserVoiceId,
        rate: ratePercent,
        pitch: 0,
        volume: 100,
      });
      const cached = ttsAudioCache.get(cacheKey);
      if (cached?.kind === "url" && !options?.prefetch) {
        return cached.audioUrl;
      }

      const audioUrl = buildMicrosoftTtsAudioUrl({
        text,
        voiceName: selectedBrowserVoiceId,
        rate: ratePercent,
        pitch: 0,
        volume: 100,
      });

      if (options?.prefetch) {
        const prefetchUrl = buildMicrosoftTtsAudioUrl({
          text,
          voiceName: selectedBrowserVoiceId,
          rate: ratePercent,
          pitch: 0,
          volume: 100,
          prefetch: true,
        });
        const res = await fetch(prefetchUrl, { method: "GET" });
        if (!res.ok && res.status !== 204) {
          const data = (await res.json().catch(() => null)) as
            | { error?: string; details?: string }
            | null;
          const message = data?.error || "朗读失败";
          const details = data?.details ? `: ${data.details}` : "";
          throw new Error(`${message}${details}`);
        }
      } else {
        // 使用稳定的同源 URL，避免移动端后台对 blob: 音频的兼容性问题
        ttsAudioCache.set(cacheKey, { kind: "url", audioUrl });
      }

      return audioUrl;
    },
    [selectedBrowserVoiceId, ttsRate]
  );
}
