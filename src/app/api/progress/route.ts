import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { readingProgress } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { badRequest, serverError, getAuthUserId } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  const authResult = await getAuthUserId();
  if (authResult.error) return authResult.error;
  const { userId } = authResult;

  const { searchParams } = new URL(req.url);
  const bookId = searchParams.get("bookId");

  if (!bookId) {
    return badRequest("缺少 bookId 参数");
  }

  try {
    const progress = await db.query.readingProgress.findFirst({
      where: and(
        eq(readingProgress.userId, userId),
        eq(readingProgress.bookId, bookId)
      ),
    });

    return NextResponse.json({
      progress: progress
        ? {
            version: progress.version,
            progress: progress.progress,
            location: progress.location,
            scrollRatio: progress.scrollRatio,
            currentPage: progress.currentPage,
            totalPages: progress.totalPages,
            readingDuration: progress.readingDuration,
            deviceId: progress.deviceId,
            lastReadAt: progress.lastReadAt,
            updatedAt: progress.updatedAt,
          }
        : null,
    });
  } catch (error) {
    logger.error("api", "Get progress error:", error);
    return serverError("获取进度失败");
  }
}
