import { createHash } from "crypto";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { synthesizeMicrosoftSpeech } from "@/lib/microsoftTts";

interface MicrosoftSpeakRequestBody {
  text?: string;
  voiceName?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  outputFormat?: string;
  prefetch?: boolean;
}

const DEFAULT_VOICE = "zh-CN-XiaoxiaoMultilingualNeural";
const AUDIO_CACHE_TTL_MS = 30 * 60 * 1000;
const AUDIO_CACHE_MAX_SIZE = 100;

interface CachedMicrosoftAudio {
  body: Buffer;
  contentType: string;
  expiresAt: number;
}

const audioCache = new Map<string, CachedMicrosoftAudio>();
const inflightAudioRequests = new Map<string, Promise<CachedMicrosoftAudio | null>>();

function parseMicrosoftSpeakPayload(body: MicrosoftSpeakRequestBody) {
  const text = body.text?.trim() || "";
  const voiceName = body.voiceName?.trim() || DEFAULT_VOICE;
  const rate = Number.isFinite(body.rate) ? Number(body.rate) : 0;
  const pitch = Number.isFinite(body.pitch) ? Number(body.pitch) : 0;
  const volume = Number.isFinite(body.volume) ? Number(body.volume) : 50;

  return {
    text,
    voiceName,
    rate,
    pitch,
    volume,
    outputFormat: body.outputFormat,
  };
}

function buildAudioCacheKey(payload: ReturnType<typeof parseMicrosoftSpeakPayload>) {
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
    audioCache.delete(cacheKey);
    return null;
  }

  audioCache.delete(cacheKey);
  audioCache.set(cacheKey, cached);
  return cached;
}

function setCachedAudio(cacheKey: string, value: CachedMicrosoftAudio) {
  if (audioCache.has(cacheKey)) {
    audioCache.delete(cacheKey);
  } else if (audioCache.size >= AUDIO_CACHE_MAX_SIZE) {
    const oldestKey = audioCache.keys().next().value;
    if (oldestKey) {
      audioCache.delete(oldestKey);
    }
  }

  audioCache.set(cacheKey, value);
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
  const payload = parseMicrosoftSpeakPayload(body);
  const prefetchOnly = body.prefetch === true;
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
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
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
    rate: searchParams.has("rate") ? Number(searchParams.get("rate")) : undefined,
    pitch: searchParams.has("pitch") ? Number(searchParams.get("pitch")) : undefined,
    volume: searchParams.has("volume") ? Number(searchParams.get("volume")) : undefined,
    outputFormat: searchParams.get("outputFormat") ?? undefined,
    prefetch: searchParams.get("prefetch") === "1",
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
