import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/api-utils";
import { listMicrosoftVoices } from "@/lib/microsoftTts";

export async function GET() {
  const authResult = await getAuthUserId();
  if (authResult.error) return authResult.error;

  try {
    const voices = await listMicrosoftVoices();
    return NextResponse.json({ voices });
  } catch (error) {
    logger.error("api", "Failed to list Microsoft voices:", error);
    return NextResponse.json({ error: "获取语音列表失败" }, { status: 500 });
  }
}
