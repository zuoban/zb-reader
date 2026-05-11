import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/api-utils";
import {
  BuiltinTtsSynthesisError,
  normalizeBuiltinTtsPayload,
  prepareBuiltinTtsAudio,
} from "@/lib/builtinTtsAudio";
import { logger } from "@/lib/logger";
import { microsoftTtsSpeakSchema } from "@/lib/validations";
import type { z } from "zod";

type MicrosoftSpeakBody = z.infer<typeof microsoftTtsSpeakSchema>;

function normalizePrefetchFlag(value: unknown): boolean {
  return value === true || value === "true" || value === "1";
}

export function normalizeMicrosoftSpeakPayload(body: MicrosoftSpeakBody) {
  return {
    ...normalizeBuiltinTtsPayload(body),
    prefetch: normalizePrefetchFlag(body.prefetch),
  };
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

async function synthesizeAndRespond(body: MicrosoftSpeakBody) {
  const payload = normalizeMicrosoftSpeakPayload(body);
  if (!payload.text) {
    return NextResponse.json({ error: "朗读文本不能为空" }, { status: 400 });
  }

  try {
    const result = await prepareBuiltinTtsAudio(payload);
    if (!result.audio) {
      return new NextResponse(null, { status: 204 });
    }

    if (payload.prefetch) {
      return new NextResponse(null, { status: 204 });
    }

    return createAudioResponse(result.audio.body, result.audio.contentType);
  } catch (error) {
    if (error instanceof BuiltinTtsSynthesisError) {
      return NextResponse.json(
        {
          error: `微软TTS请求失败(${error.status})`,
          details: error.details.slice(0, 300),
        },
        { status: 502 }
      );
    }

    logger.error("api", "Failed to synthesize Microsoft speech:", error);
    return NextResponse.json({ error: "生成语音失败" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const authResult = await getAuthUserId();
  if (authResult.error) {
    return authResult.error;
  }

  const searchParams = req.nextUrl.searchParams;
  const parsed = microsoftTtsSpeakSchema.safeParse({
    text: searchParams.get("text") ?? undefined,
    voiceName: searchParams.get("voiceName") ?? undefined,
    rate: searchParams.get("rate") ?? undefined,
    pitch: searchParams.get("pitch") ?? undefined,
    volume: searchParams.get("volume") ?? undefined,
    outputFormat: searchParams.get("outputFormat") ?? undefined,
    prefetch: searchParams.get("prefetch") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "参数校验失败" },
      { status: 400 }
    );
  }

  return synthesizeAndRespond(parsed.data);
}

export async function POST(req: NextRequest) {
  const authResult = await getAuthUserId();
  if (authResult.error) {
    return authResult.error;
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "无效的请求体" }, { status: 400 });
  }

  const parsed = microsoftTtsSpeakSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "参数校验失败" },
      { status: 400 }
    );
  }

  return synthesizeAndRespond(parsed.data);
}
