import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { readingProgress } from "@/lib/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

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
    const allProgress = await db.query.readingProgress.findMany({
      where: and(
        eq(readingProgress.userId, session.user.id),
        eq(readingProgress.bookId, bookId)
      ),
      orderBy: [desc(readingProgress.updatedAt)],
    });

    const latestProgress = allProgress[0] || null;

    return NextResponse.json({ progress: latestProgress });
  } catch (error) {
    logger.error("api", "Get progress error:", error);
    return NextResponse.json({ error: "获取进度失败" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const {
      bookId,
      progress,
      location,
      currentPage,
      totalPages,
      deviceId,
      deviceName,
    } = await req.json();

    logger.debug("api", "[Progress API PUT]", {
      userId: session.user.id,
      bookId,
      progress,
      deviceId,
      location: location?.slice(0, 50) + "...",
    });

    if (!bookId) {
      return NextResponse.json(
        { error: "缺少 bookId 参数" },
        { status: 400 }
      );
    }

    const effectiveDeviceId = deviceId || "legacy";
    const now = new Date().toISOString().replace("T", " ").replace("Z", "");

    await db
      .insert(readingProgress)
      .values({
        id: uuidv4(),
        userId: session.user.id,
        bookId,
        deviceId: effectiveDeviceId,
        deviceName: deviceName ?? null,
        progress: progress ?? 0,
        location: location ?? null,
        currentPage: currentPage ?? null,
        totalPages: totalPages ?? null,
        lastReadAt: now,
      })
      .onConflictDoUpdate({
        target: [readingProgress.userId, readingProgress.bookId, readingProgress.deviceId],
        set: {
          progress: sql`COALESCE(${progress ?? null}, ${readingProgress.progress})`,
          location: sql`COALESCE(${location ?? null}, ${readingProgress.location})`,
          currentPage: sql`COALESCE(${currentPage ?? null}, ${readingProgress.currentPage})`,
          totalPages: sql`COALESCE(${totalPages ?? null}, ${readingProgress.totalPages})`,
          deviceName: sql`COALESCE(${deviceName ?? null}, ${readingProgress.deviceName})`,
          lastReadAt: now,
          updatedAt: now,
        },
      });

    return NextResponse.json({
      progress: {
        userId: session.user.id,
        bookId,
        deviceId: effectiveDeviceId,
        deviceName: deviceName ?? null,
        progress: progress ?? 0,
        location: location ?? null,
        currentPage: currentPage ?? null,
        totalPages: totalPages ?? null,
        lastReadAt: now,
      },
    });
  } catch (error) {
    logger.error("api", "Update progress error:", error);
    return NextResponse.json({ error: "更新进度失败" }, { status: 500 });
  }
}
