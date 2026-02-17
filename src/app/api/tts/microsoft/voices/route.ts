import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listMicrosoftVoices } from "@/lib/microsoftTts";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const voices = await listMicrosoftVoices();
    return NextResponse.json({ voices });
  } catch (error) {
    console.error("Failed to list Microsoft voices:", error);
    return NextResponse.json({ error: "获取语音列表失败" }, { status: 500 });
  }
}
