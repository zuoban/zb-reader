import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { readingProgress } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { findOwnedBook } from "@/lib/book-ownership";
import { serverError, validateJson, getAuthUserId } from "@/lib/api-utils";
import { progressSchema } from "@/lib/validations";
import { z } from "zod";

const batchProgressSchema = z.array(progressSchema);

export async function POST(req: NextRequest) {
  const authResult = await getAuthUserId();
  if (authResult.error) return authResult.error;
  const { userId } = authResult;

  try {
    const parsed = await validateJson(req, batchProgressSchema);
    if (parsed.error) {
      return parsed.error;
    }

    const items = parsed.data;
    const results = [];

    for (const item of items) {
      const {
        syncId,
        bookId,
        progress,
        location,
        scrollRatio,
        deviceId,
        currentPage,
        totalPages,
      } = item;

      const book = await findOwnedBook(bookId, userId);
      if (!book) {
        results.push({ bookId, status: "error", error: "书籍不存在" });
        continue;
      }

      const currentProgress = await db.query.readingProgress.findFirst({
        where: and(
          eq(readingProgress.userId, userId),
          eq(readingProgress.bookId, bookId)
        ),
      });

      if (currentProgress && syncId && currentProgress.lastSyncId === syncId) {
        results.push({
          bookId,
          status: "unchanged",
          idempotent: true,
        });
        continue;
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

        results.push({
          bookId,
          status: "created",
        });
        continue;
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

      results.push({
        bookId,
        status: "updated",
      });
    }

    return NextResponse.json({ results });
  } catch (error) {
    logger.error("api", "[Progress Batch Sync] Error:", error);
    return serverError("批量同步失败");
  }
}
