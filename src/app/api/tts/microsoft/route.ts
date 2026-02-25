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
}

const DEFAULT_VOICE = "zh-CN-XiaoxiaoMultilingualNeural";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as MicrosoftSpeakRequestBody;
    const text = body.text?.trim() || "";
    if (!text) {
      return NextResponse.json({ error: "朗读文本不能为空" }, { status: 400 });
    }

    const voiceName = body.voiceName?.trim() || DEFAULT_VOICE;
    const rate = Number.isFinite(body.rate) ? Number(body.rate) : 0;
    const pitch = Number.isFinite(body.pitch) ? Number(body.pitch) : 0;
    const volume = Number.isFinite(body.volume) ? Number(body.volume) : 50;

    const response = await synthesizeMicrosoftSpeech({
      text,
      voiceName,
      rate,
      pitch,
      volume,
      outputFormat: body.outputFormat,
    });

    if (!response.ok) {
      const details = (await response.text()).slice(0, 300);
      return NextResponse.json(
        {
          error: `微软TTS请求失败(${response.status})`,
          details,
        },
        { status: 502 }
      );
    }

    const arrayBuffer = await response.arrayBuffer();

    if (arrayBuffer.byteLength === 0) {
      return new NextResponse(null, { status: 204 });
    }

    const contentType = response.headers.get("content-type") || "audio/mpeg";
    return new NextResponse(Buffer.from(arrayBuffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Failed to synthesize Microsoft speech:", error);
    return NextResponse.json({ error: "生成语音失败" }, { status: 500 });
  }
}
