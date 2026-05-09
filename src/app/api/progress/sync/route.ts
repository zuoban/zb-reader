import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { readingProgress } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { findOwnedBook } from "@/lib/book-ownership";
import { notFound, serverError, validateJson, getAuthUserId } from "@/lib/api-utils";
import { progressSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  const authResult = await getAuthUserId();
  if (authResult.error) return authResult.error;
  const { userId } = authResult;

  try {
    const parsed = await validateJson(req, progressSchema);
    if (parsed.error) {
      return parsed.error;
    }

    const {
      syncId,
      bookId,
      progress,
      location,
      scrollRatio,
      deviceId,
      currentPage,
      totalPages,
    } = parsed.data;

    logger.debug("api", "[Progress Sync] Request", {
      userId: userId,
      bookId,
      syncId,
    });

    const book = await findOwnedBook(bookId, userId);
    if (!book) {
      return notFound("书籍不存在");
    }

    const currentProgress = await db.query.readingProgress.findFirst({
      where: and(
        eq(readingProgress.userId, userId),
        eq(readingProgress.bookId, bookId)
      ),
    });

    // 幂等性检查：如果 syncId 已处理，直接返回成功
    if (currentProgress && syncId && currentProgress.lastSyncId === syncId) {
      return NextResponse.json({
        status: "unchanged",
        idempotent: true,
      });
    }

    const now = new Date().toISOString();
    const incomingProgress = progress ?? 0;

    if (!currentProgress) {
      await db.insert(readingProgress).values({
        id: uuidv4(),
        userId: userId,
        bookId,
        progress: incomingProgress,
        furthestProgress: incomingProgress,
        location: location ?? null,
        scrollRatio: scrollRatio ?? null,
        currentPage: currentPage ?? null,
        totalPages: totalPages ?? null,
        deviceId: deviceId ?? null,
        lastSyncId: syncId ?? null,
        lastReadAt: now,
        createdAt: now,
        updatedAt: now,
      });

      return NextResponse.json({
        status: "created",
      });
    }

    const finalProgress = progress ?? currentProgress.progress;
    const finalFurthestProgress = Math.max(
      currentProgress.furthestProgress ?? currentProgress.progress ?? 0,
      finalProgress
    );

    await db
      .update(readingProgress)
      .set({
        progress: finalProgress,
        furthestProgress: finalFurthestProgress,
        location: location ?? currentProgress.location,
        scrollRatio: scrollRatio ?? currentProgress.scrollRatio,
        currentPage: currentPage ?? currentProgress.currentPage,
        totalPages: totalPages ?? currentProgress.totalPages,
        deviceId: deviceId ?? currentProgress.deviceId,
        lastSyncId: syncId ?? null,
        lastReadAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(readingProgress.userId, userId),
          eq(readingProgress.bookId, bookId)
        )
      );

    return NextResponse.json({
      status: "updated",
    });
  } catch (error) {
    logger.error("api", "[Progress Sync] Error:", error);
    return serverError("同步失败");
  }
}
