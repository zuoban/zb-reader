import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/api-utils";
import { BuiltinTtsSynthesisError, prepareBuiltinTtsAudio } from "@/lib/builtinTtsAudio";
import { logger } from "@/lib/logger";
import { microsoftTtsSpeakSchema } from "@/lib/validations";

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

  try {
    const result = await prepareBuiltinTtsAudio(parsed.data);
    if (!result.audio) {
      return NextResponse.json({ error: "生成语音为空" }, { status: 502 });
    }

    return NextResponse.json({
      audioUrl: `/api/tts/builtin/audio/${result.cacheKey}`,
    });
  } catch (error) {
    if (error instanceof BuiltinTtsSynthesisError) {
      return NextResponse.json(
        {
          error: `内置TTS请求失败(${error.status})`,
          details: error.details.slice(0, 300),
        },
        { status: 502 }
      );
    }

    if (error instanceof Error && error.message === "朗读文本不能为空") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    logger.error("api", "Failed to prepare builtin TTS audio:", error);
    return NextResponse.json({ error: "生成语音失败" }, { status: 500 });
  }
}
