import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { progressHistory } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const bookId = searchParams.get("bookId");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 50);

  if (!bookId) {
    return NextResponse.json({ error: "缺少 bookId 参数" }, { status: 400 });
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
    return NextResponse.json({ error: "获取历史失败" }, { status: 500 });
  }
}
