import { createHash } from "crypto";
import { synthesizeMicrosoftSpeech } from "@/lib/microsoftTts";
import type { microsoftTtsSpeakSchema } from "@/lib/validations";
import type { z } from "zod";

type BuiltinTtsSpeakBody = z.infer<typeof microsoftTtsSpeakSchema>;

const DEFAULT_VOICE = "zh-CN-XiaoxiaoMultilingualNeural";
const AUDIO_CACHE_TTL_MS = 30 * 60 * 1000;
const AUDIO_CACHE_MAX_SIZE = 100;
const AUDIO_CACHE_MAX_BYTES = 10 * 1024 * 1024;
const DEFAULT_OUTPUT_FORMAT = "audio-24khz-48kbitrate-mono-mp3";

export interface CachedBuiltinTtsAudio {
  body: Buffer;
  contentType: string;
  expiresAt: number;
}

export class BuiltinTtsSynthesisError extends Error {
  constructor(
    public readonly status: number,
    public readonly details: string
  ) {
    super(`内置TTS请求失败(${status}): ${details}`);
  }
}

const audioCache = new Map<string, CachedBuiltinTtsAudio>();
let audioCacheTotalBytes = 0;
const inflightAudioRequests = new Map<string, Promise<CachedBuiltinTtsAudio | null>>();

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const numericValue =
    typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(numericValue)));
}

export function normalizeBuiltinTtsPayload(body: BuiltinTtsSpeakBody) {
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const voiceName =
    typeof body.voiceName === "string" && body.voiceName.trim()
      ? body.voiceName.trim()
      : DEFAULT_VOICE;
  const rate = clampNumber(body.rate, -100, 100, 0);
  const pitch = clampNumber(body.pitch, -100, 100, 0);
  const volume = clampNumber(body.volume, 0, 100, 50);

  return {
    text,
    voiceName,
    rate,
    pitch,
    volume,
    outputFormat:
      typeof body.outputFormat === "string" && body.outputFormat.trim()
        ? body.outputFormat.trim()
        : undefined,
  };
}

export function buildBuiltinTtsCacheKey(
  payload: ReturnType<typeof normalizeBuiltinTtsPayload>
) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        text: payload.text,
        voiceName: payload.voiceName,
        rate: payload.rate,
        pitch: payload.pitch,
        volume: payload.volume,
        outputFormat: payload.outputFormat || DEFAULT_OUTPUT_FORMAT,
      })
    )
    .digest("base64url");
}

export function getCachedBuiltinTtsAudio(cacheKey: string) {
  const cached = audioCache.get(cacheKey);
  if (!cached) return null;

  if (cached.expiresAt <= Date.now()) {
    audioCacheTotalBytes -= cached.body.byteLength;
    audioCache.delete(cacheKey);
    return null;
  }

  audioCache.delete(cacheKey);
  audioCache.set(cacheKey, cached);
  return cached;
}

function setCachedBuiltinTtsAudio(cacheKey: string, value: CachedBuiltinTtsAudio) {
  if (audioCache.has(cacheKey)) {
    const existing = audioCache.get(cacheKey)!;
    audioCacheTotalBytes -= existing.body.byteLength;
    audioCache.delete(cacheKey);
  }

  while (
    audioCache.size >= AUDIO_CACHE_MAX_SIZE ||
    audioCacheTotalBytes + value.body.byteLength > AUDIO_CACHE_MAX_BYTES
  ) {
    const oldestKey = audioCache.keys().next().value;
    if (!oldestKey) break;
    const oldest = audioCache.get(oldestKey);
    if (oldest) audioCacheTotalBytes -= oldest.body.byteLength;
    audioCache.delete(oldestKey);
  }

  audioCache.set(cacheKey, value);
  audioCacheTotalBytes += value.body.byteLength;
}

export async function prepareBuiltinTtsAudio(body: BuiltinTtsSpeakBody) {
  const payload = normalizeBuiltinTtsPayload(body);
  if (!payload.text) {
    throw new Error("朗读文本不能为空");
  }

  const cacheKey = buildBuiltinTtsCacheKey(payload);
  const cached = getCachedBuiltinTtsAudio(cacheKey);
  if (cached) {
    return { cacheKey, audio: cached };
  }

  let pendingRequest = inflightAudioRequests.get(cacheKey);
  if (!pendingRequest) {
    pendingRequest = (async () => {
      const response = await synthesizeMicrosoftSpeech({
        text: payload.text,
        voiceName: payload.voiceName,
        rate: payload.rate,
        pitch: payload.pitch,
        volume: payload.volume,
        outputFormat: payload.outputFormat,
      });

      if (!response.ok) {
        const details = (await response.text()).slice(0, 300);
        throw new BuiltinTtsSynthesisError(response.status, details);
      }

      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength === 0) {
        return null;
      }

      const entry: CachedBuiltinTtsAudio = {
        body: Buffer.from(arrayBuffer),
        contentType: response.headers.get("content-type") || "audio/mpeg",
        expiresAt: Date.now() + AUDIO_CACHE_TTL_MS,
      };
      setCachedBuiltinTtsAudio(cacheKey, entry);
      return entry;
    })().finally(() => {
      inflightAudioRequests.delete(cacheKey);
    });

    inflightAudioRequests.set(cacheKey, pendingRequest);
  }

  const audio = await pendingRequest;
  return { cacheKey, audio };
}

export function isBuiltinTtsCacheKey(value: string) {
  return /^[A-Za-z0-9_-]{43}$/.test(value);
}
