import { NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/api-utils";
import { getBuiltinTtsCacheStats } from "@/lib/builtinTtsAudio";

export async function GET() {
  const authResult = await getAuthUserId();
  if (authResult.error) {
    return authResult.error;
  }

  return NextResponse.json({ stats: getBuiltinTtsCacheStats() });
}
