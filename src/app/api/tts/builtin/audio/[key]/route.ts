import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/api-utils";
import { getCachedBuiltinTtsAudio, isBuiltinTtsCacheKey } from "@/lib/builtinTtsAudio";

interface RouteContext {
  params: Promise<{ key: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const authResult = await getAuthUserId();
  if (authResult.error) {
    return authResult.error;
  }

  const { key } = await params;
  if (!isBuiltinTtsCacheKey(key)) {
    return NextResponse.json({ error: "音频缓存 key 无效" }, { status: 400 });
  }

  const cached = getCachedBuiltinTtsAudio(key);
  if (!cached) {
    return NextResponse.json({ error: "音频缓存已过期" }, { status: 404 });
  }

  return new NextResponse(Buffer.from(cached.body), {
    status: 200,
    headers: {
      "Content-Type": cached.contentType,
      "Cache-Control": "no-store",
    },
  });
}
