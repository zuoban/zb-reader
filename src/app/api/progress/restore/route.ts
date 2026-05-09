import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { db, getSqlite } from "@/lib/db";
import { progressHistory } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { badRequest, notFound, serverError, getAuthUserId } from "@/lib/api-utils";

export async function POST(req: NextRequest) {
  const authResult = await getAuthUserId();
  if (authResult.error) return authResult.error;
  const { userId } = authResult;

  try {
    const { historyId } = await req.json();

    if (!historyId) {
      return badRequest("缺少 historyId 参数");
    }

    const historyRecord = await db.query.progressHistory.findFirst({
      where: and(
        eq(progressHistory.id, historyId),
        eq(progressHistory.userId, userId)
      ),
    });

    if (!historyRecord) {
      return notFound("历史记录不存在");
    }

    const now = new Date().toISOString();
    const sqlite = getSqlite();

    const transaction = sqlite.transaction(() => {
      const current = sqlite
        .prepare("SELECT * FROM reading_progress WHERE user_id = ? AND book_id = ?")
        .get(userId, historyRecord.bookId) as
        | {
            id: string;
            book_id: string;
            progress: number;
            furthest_progress: number;
            location: string | null;
            scroll_ratio: number | null;
            reading_duration: number;
            device_id: string | null;
          }
        | undefined;

      if (current) {
        sqlite
          .prepare(
            `INSERT INTO progress_history (id, user_id, book_id, progress, location, scroll_ratio, reading_duration, device_id, device_name, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            uuidv4(),
            userId,
            current.book_id,
            current.progress,
            current.location,
            current.scroll_ratio,
            current.reading_duration,
            current.device_id,
            null,
            now
          );

        sqlite
          .prepare(
            `UPDATE reading_progress SET progress = ?, furthest_progress = ?, location = ?, scroll_ratio = ?, reading_duration = ?, device_id = ?, last_read_at = ?, updated_at = ? WHERE user_id = ? AND book_id = ?`
          )
          .run(
            historyRecord.progress,
            Math.max(current.furthest_progress ?? current.progress ?? 0, historyRecord.progress),
            historyRecord.location,
            historyRecord.scrollRatio,
            historyRecord.readingDuration,
            historyRecord.deviceId,
            now,
            now,
            userId,
            historyRecord.bookId
          );
      } else {
        sqlite
          .prepare(
            `INSERT INTO reading_progress (id, user_id, book_id, progress, furthest_progress, location, scroll_ratio, reading_duration, device_id, last_read_at, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            uuidv4(),
            userId,
            historyRecord.bookId,
            historyRecord.progress,
            historyRecord.progress,
            historyRecord.location,
            historyRecord.scrollRatio,
            historyRecord.readingDuration,
            historyRecord.deviceId,
            now,
            now,
            now
          );
      }
    });

    transaction();

    logger.info("api", "[Progress Restore] Restored", {
      userId: userId,
      bookId: historyRecord.bookId,
      historyId,
    });

    return NextResponse.json({
      status: "restored",
      progress: {
        progress: historyRecord.progress,
        location: historyRecord.location,
        scrollRatio: historyRecord.scrollRatio,
        readingDuration: historyRecord.readingDuration,
      },
    });
  } catch (error) {
    logger.error("api", "[Progress Restore] Error:", error);
    return serverError("恢复失败");
  }
}
