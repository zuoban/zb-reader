import { createHash } from "crypto";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/api-utils";
import { synthesizeMicrosoftSpeech } from "@/lib/microsoftTts";

interface MicrosoftSpeakRequestBody {
  text?: string;
  voiceName?: string;
  rate?: number | string;
  pitch?: number | string;
  volume?: number | string;
  outputFormat?: string;
  prefetch?: boolean | string;
}

const DEFAULT_VOICE = "zh-CN-XiaoxiaoMultilingualNeural";
const AUDIO_CACHE_TTL_MS = 30 * 60 * 1000;
const AUDIO_CACHE_MAX_SIZE = 100;
const AUDIO_CACHE_MAX_BYTES = 10 * 1024 * 1024; // 10MB hard limit

interface CachedMicrosoftAudio {
  body: Buffer;
  contentType: string;
  expiresAt: number;
}

const audioCache = new Map<string, CachedMicrosoftAudio>();
let audioCacheTotalBytes = 0;
const inflightAudioRequests = new Map<string, Promise<CachedMicrosoftAudio | null>>();

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const numericValue = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(numericValue)));
}

function normalizePrefetchFlag(value: unknown): boolean {
  return value === true || value === "true" || value === "1";
}

export function normalizeMicrosoftSpeakPayload(body: MicrosoftSpeakRequestBody) {
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const voiceName = typeof body.voiceName === "string" && body.voiceName.trim() ? body.voiceName.trim() : DEFAULT_VOICE;
  const rate = clampNumber(body.rate, -100, 100, 0);
  const pitch = clampNumber(body.pitch, -100, 100, 0);
  const volume = clampNumber(body.volume, 0, 100, 50);

  return {
    text,
    voiceName,
    rate,
    pitch,
    volume,
    outputFormat: typeof body.outputFormat === "string" && body.outputFormat.trim() ? body.outputFormat.trim() : undefined,
    prefetch: normalizePrefetchFlag(body.prefetch),
  };
}

function buildAudioCacheKey(payload: ReturnType<typeof normalizeMicrosoftSpeakPayload>) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        text: payload.text,
        voiceName: payload.voiceName,
        rate: payload.rate,
        pitch: payload.pitch,
        volume: payload.volume,
        outputFormat: payload.outputFormat || "audio-24khz-48kbitrate-mono-mp3",
      })
    )
    .digest("base64url");
}

function getCachedAudio(cacheKey: string) {
  const cached = audioCache.get(cacheKey);
  if (!cached) return null;

  if (cached.expiresAt <= Date.now()) {
    audioCacheTotalBytes -= cached.body.byteLength;
    audioCache.delete(cacheKey);
    return null;
  }

  // Re-insert to update LRU order
  audioCache.delete(cacheKey);
  audioCache.set(cacheKey, cached);
  return cached;
}

function setCachedAudio(cacheKey: string, value: CachedMicrosoftAudio) {
  if (audioCache.has(cacheKey)) {
    const existing = audioCache.get(cacheKey)!;
    audioCacheTotalBytes -= existing.body.byteLength;
    audioCache.delete(cacheKey);
  }

  // Evict oldest entries if memory or count limit exceeded
  while (audioCache.size >= AUDIO_CACHE_MAX_SIZE || audioCacheTotalBytes + value.body.byteLength > AUDIO_CACHE_MAX_BYTES) {
    const oldestKey = audioCache.keys().next().value;
    if (!oldestKey) break;
    const oldest = audioCache.get(oldestKey);
    if (oldest) audioCacheTotalBytes -= oldest.body.byteLength;
    audioCache.delete(oldestKey);
  }

  audioCache.set(cacheKey, value);
  audioCacheTotalBytes += value.body.byteLength;
}

function createAudioResponse(body: Buffer, contentType: string) {
  return new NextResponse(Buffer.from(body), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
    },
  });
}

async function synthesizeAndRespond(body: MicrosoftSpeakRequestBody) {
  const payload = normalizeMicrosoftSpeakPayload(body);
  const prefetchOnly = payload.prefetch;
  if (!payload.text) {
    return NextResponse.json({ error: "朗读文本不能为空" }, { status: 400 });
  }

  const cacheKey = buildAudioCacheKey(payload);
  const cached = getCachedAudio(cacheKey);
  if (cached) {
    if (prefetchOnly) {
      return new NextResponse(null, { status: 204 });
    }
    return createAudioResponse(cached.body, cached.contentType);
  }

  try {
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
          throw new Error(`微软TTS请求失败(${response.status}): ${details}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        if (arrayBuffer.byteLength === 0) {
          return null;
        }

        const entry: CachedMicrosoftAudio = {
          body: Buffer.from(arrayBuffer),
          contentType: response.headers.get("content-type") || "audio/mpeg",
          expiresAt: Date.now() + AUDIO_CACHE_TTL_MS,
        };
        setCachedAudio(cacheKey, entry);
        return entry;
      })().finally(() => {
        inflightAudioRequests.delete(cacheKey);
      });

      inflightAudioRequests.set(cacheKey, pendingRequest);
    }

    const result = await pendingRequest;

    if (!result) {
      return new NextResponse(null, { status: 204 });
    }

    if (prefetchOnly) {
      return new NextResponse(null, { status: 204 });
    }

    return createAudioResponse(result.body, result.contentType);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("微软TTS请求失败(")) {
      const [, statusPart = "502", details = ""] =
        error.message.match(/^微软TTS请求失败\((\d+)\):?\s?(.*)$/) || [];
      return NextResponse.json(
        {
          error: `微软TTS请求失败(${statusPart})`,
          details: details.slice(0, 300),
        },
        { status: 502 }
      );
    }

    logger.error("api", "Failed to synthesize Microsoft speech:", error);
    return NextResponse.json({ error: "生成语音失败" }, { status: 500 });
  }
}

async function ensureAuthenticated() {
  const authResult = await getAuthUserId();
  if (authResult.error) {
    return authResult.error;
  }
  return null;
}

export async function GET(req: NextRequest) {
  const unauthorizedResponse = await ensureAuthenticated();
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const searchParams = req.nextUrl.searchParams;

  return synthesizeAndRespond({
    text: searchParams.get("text") ?? undefined,
    voiceName: searchParams.get("voiceName") ?? undefined,
    rate: searchParams.get("rate") ?? undefined,
    pitch: searchParams.get("pitch") ?? undefined,
    volume: searchParams.get("volume") ?? undefined,
    outputFormat: searchParams.get("outputFormat") ?? undefined,
    prefetch: searchParams.get("prefetch") ?? undefined,
  });
}

export async function POST(req: NextRequest) {
  const unauthorizedResponse = await ensureAuthenticated();
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const body = (await req.json()) as MicrosoftSpeakRequestBody;
  return synthesizeAndRespond(body);
}
