import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ttsConfigs } from "@/lib/db/schema";
import {
  buildLegadoRequestBody,
  parseLegadoSpeechResult,
  resolveLegadoRequestUrl,
  resolveConfigHeaders,
  type TtsConfigApiItem,
} from "@/lib/tts";

interface SpeakRequestBody {
  configId?: string;
  text?: string;
  speakSpeed?: number;
}

interface SafeRequestResult {
  response: Response;
  retried: boolean;
}

async function requestWithFallback(
  url: string,
  init: RequestInit,
  fallbackBody?: BodyInit
): Promise<SafeRequestResult> {
  const firstResponse = await fetch(url, init);
  if (firstResponse.ok) {
    return { response: firstResponse, retried: false };
  }

  const canRetryWithGet =
    init.method === "POST" &&
    (firstResponse.status === 400 || firstResponse.status === 404 || firstResponse.status === 405 || firstResponse.status === 415);

  if (!canRetryWithGet) {
    return { response: firstResponse, retried: false };
  }

  const secondResponse = await fetch(url, {
    method: "GET",
    headers: init.headers,
    body: fallbackBody,
  });
  return { response: secondResponse, retried: true };
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as SpeakRequestBody;
    const configId = body.configId?.trim();
    const text = body.text?.trim();
    const speakSpeed =
      typeof body.speakSpeed === "number" && Number.isFinite(body.speakSpeed)
        ? body.speakSpeed
        : 1;

    if (!configId || !text) {
      return NextResponse.json({ error: "参数不完整" }, { status: 400 });
    }

    const config = await db
      .select()
      .from(ttsConfigs)
      .where(eq(ttsConfigs.id, configId))
      .get();

    if (!config) {
      return NextResponse.json({ error: "TTS配置不存在" }, { status: 404 });
    }

    const normalizedConfig: TtsConfigApiItem = {
      id: config.id,
      name: config.name,
      url: config.url,
      method: config.method,
      headers: config.headers,
      body: config.body,
      contentType: config.contentType,
      concurrentRate: config.concurrentRate,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };

    const headers = resolveConfigHeaders(normalizedConfig);
    const method = (normalizedConfig.method || "GET").toUpperCase();
    const init: RequestInit = {
      method,
      headers,
    };
    let requestBodyForRetry: BodyInit | undefined;

    if (method !== "GET" && method !== "HEAD") {
      const requestBody = buildLegadoRequestBody(
        normalizedConfig,
        text,
        speakSpeed
      );
      if (requestBody) {
        init.body = requestBody;
        requestBodyForRetry = requestBody;
      }

      if (
        normalizedConfig.contentType &&
        !Object.keys(headers).some((key) => key.toLowerCase() === "content-type")
      ) {
        (init.headers as Record<string, string>)["Content-Type"] =
          normalizedConfig.contentType;
      }
    }

    const resolvedUrl = resolveLegadoRequestUrl(
      normalizedConfig.url,
      text,
      speakSpeed
    );
    const requestResult = await requestWithFallback(
      resolvedUrl,
      init,
      requestBodyForRetry
    );
    const response = requestResult.response;
    const responseContentType = response.headers.get("content-type") || "";

    if (response.ok && (responseContentType.startsWith("audio/") || responseContentType.includes("application/octet-stream"))) {
      return new NextResponse(response.body, {
        status: 200,
        headers: {
          "Content-Type": responseContentType,
          "Cache-Control": "no-store",
        },
      });
    }

    const responseText = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `TTS服务请求失败(${response.status})`,
          details: responseText.slice(0, 300),
          request: {
            method,
            url: resolvedUrl,
            hasBody: Boolean(init.body),
            retriedWithGet: requestResult.retried,
          },
        },
        { status: 502 }
      );
    }

    const parsed = parseLegadoSpeechResult(responseText);
    if (!parsed.text && !parsed.audioUrl) {
      return NextResponse.json({ error: "TTS返回内容为空" }, { status: 502 });
    }

    return NextResponse.json({ text: parsed.text, audioUrl: parsed.audioUrl });
  } catch (error) {
    console.error("Failed to request TTS speech text:", error);
    return NextResponse.json({ error: "获取朗读内容失败" }, { status: 500 });
  }
}
