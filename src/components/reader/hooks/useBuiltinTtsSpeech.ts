"use client";

import { useCallback } from "react";
import { ttsAudioCache, TtsAudioLruCache } from "@/lib/ttsAudioCache";

interface BuiltinTtsAudioParams {
  text: string;
  voiceName: string;
  rate: number;
  pitch: number;
  volume: number;
}

interface BuiltinTtsPrepareResponse {
  audioUrl?: string;
  error?: string;
  details?: string;
}

async function prepareBuiltinTtsAudioWithRetry(
  params: BuiltinTtsAudioParams,
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

      const data = (await res.json().catch(() => null)) as BuiltinTtsPrepareResponse | null;
      if (!res.ok) {
        const message = data?.error || "朗读失败";
        const details = data?.details ? `: ${data.details}` : "";
        throw new Error(`${message}${details}`);
      }

      if (!data?.audioUrl) {
        throw new Error("朗读失败: 音频地址为空");
      }

      return data.audioUrl;
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
      }

      const audioUrl = await prepareBuiltinTtsAudioWithRetry(
        {
          text,
          voiceName: selectedVoiceId,
          rate: ratePercent,
          pitch: 0,
          volume: 100,
        },
        options?.signal
      );

      // 使用服务端短 URL，避免完整朗读文本出现在音频 URL 中。
      ttsAudioCache.set(cacheKey, { kind: "url", audioUrl });

      return audioUrl;
    },
    [selectedVoiceId, ttsRate]
  );
}
