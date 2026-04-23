import { NextRequest, NextResponse } from "next/server";

import { and, desc, eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { badRequest, serverError, unauthorized } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { progressHistory } from "@/lib/db/schema";
import { logger } from "@/lib/logger";

const DEFAULT_HISTORY_LIMIT = 50;
const MAX_HISTORY_LIMIT = 50;

export function normalizeProgressHistoryLimit(limitParam: string | null): number {
  const parsedLimit = Number.parseInt(limitParam || "", 10);
  if (!Number.isFinite(parsedLimit) || parsedLimit < 1) {
    return DEFAULT_HISTORY_LIMIT;
  }

  return Math.min(parsedLimit, MAX_HISTORY_LIMIT);
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorized();
  }

  const { searchParams } = new URL(req.url);
  const bookId = searchParams.get("bookId");
  const limit = normalizeProgressHistoryLimit(searchParams.get("limit"));

  if (!bookId) {
    return badRequest("缺少 bookId 参数");
  }

  try {
    const history = await db
      .select()
      .from(progressHistory)
      .where(
        and(
          eq(progressHistory.userId, session.user.id),
          eq(progressHistory.bookId, bookId)
        )
      )
      .orderBy(desc(progressHistory.createdAt))
      .limit(limit);

    return NextResponse.json({
      history: history.map((item) => ({
        id: item.id,
        version: item.version,
        progress: item.progress,
        location: item.location,
        scrollRatio: item.scrollRatio,
        readingDuration: item.readingDuration,
        deviceId: item.deviceId,
        deviceName: item.deviceName,
        createdAt: item.createdAt,
      })),
      total: history.length,
    });
  } catch (error) {
    logger.error("api", "[Progress History] Error:", error);
    return serverError("获取历史失败");
  }
}
