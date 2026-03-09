import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { readingProgress } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const bookId = searchParams.get("bookId");

  if (!bookId) {
    return NextResponse.json({ error: "缺少 bookId 参数" }, { status: 400 });
  }

  try {
    const progress = await db.query.readingProgress.findFirst({
      where: and(
        eq(readingProgress.userId, session.user.id),
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
    return NextResponse.json({ error: "获取进度失败" }, { status: 500 });
  }
}
