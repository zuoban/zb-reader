import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, getSqlite } from "@/lib/db";
import { readingProgress } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { resolveConflict, type ClientProgress } from "@/lib/conflict-resolver";
import { findOwnedBook } from "@/lib/book-ownership";
import { unauthorized, notFound, serverError, validateJson } from "@/lib/api-utils";
import { progressSchema } from "@/lib/validations";

const MAX_HISTORY_COUNT = 50;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorized();
  }

  try {
    const parsed = await validateJson(req, progressSchema);
    if (parsed.error) {
      return parsed.error;
    }

    const {
      bookId,
      clientVersion,
      progress,
      location,
      scrollRatio,
      readingDuration,
      deviceId,
      clientTimestamp,
      currentPage,
      totalPages,
    } = parsed.data;

    logger.debug("api", "[Progress Sync] Request", {
      userId: session.user.id,
      bookId,
      clientVersion,
      progress,
    });

    const book = await findOwnedBook(bookId, session.user.id);
    if (!book) {
      return notFound("书籍不存在");
    }

    const currentProgress = await db.query.readingProgress.findFirst({
      where: and(
        eq(readingProgress.userId, session.user.id),
        eq(readingProgress.bookId, bookId)
      ),
    });

    const now = new Date().toISOString();

    if (!currentProgress) {
      const newVersion = 1;
      
      await db.insert(readingProgress).values({
        id: uuidv4(),
        userId: session.user.id,
        bookId,
        version: newVersion,
        progress: progress ?? 0,
        location: location ?? null,
        scrollRatio: scrollRatio ?? null,
        currentPage: currentPage ?? null,
        totalPages: totalPages ?? null,
        readingDuration: readingDuration ?? 0,
        deviceId: deviceId ?? null,
        lastReadAt: now,
        createdAt: now,
        updatedAt: now,
      });

      return NextResponse.json({
        status: "created",
        serverVersion: newVersion,
        merged: false,
      });
    }

    const clientPayload: ClientProgress = {
      version: clientVersion,
      progress: progress ?? 0,
      location: location ?? "",
      scrollRatio: scrollRatio ?? null,
      readingDuration: readingDuration ?? 0,
      deviceId: deviceId ?? "",
      clientTimestamp: clientTimestamp ?? now,
    };

    if (clientVersion === currentProgress.version) {
      const newVersion = currentProgress.version + 1;

      // 累加阅读时长而不是覆盖
      const newReadingDuration = (currentProgress.readingDuration || 0) + (clientPayload.readingDuration || 0);

      await db
        .update(readingProgress)
        .set({
          version: newVersion,
          progress: clientPayload.progress,
          location: clientPayload.location,
          scrollRatio: clientPayload.scrollRatio,
          currentPage: currentPage ?? null,
          totalPages: totalPages ?? null,
          readingDuration: newReadingDuration,
          deviceId: clientPayload.deviceId,
          lastReadAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(readingProgress.userId, session.user.id),
            eq(readingProgress.bookId, bookId)
          )
        );

      return NextResponse.json({
        status: "updated",
        serverVersion: newVersion,
        merged: false,
      });
    }

    const resolution = resolveConflict(currentProgress, clientPayload);

    const newVersion = currentProgress.version + 1;
    const sqlite = getSqlite();
    const transaction = sqlite.transaction(() => {
      sqlite
        .prepare(
          `INSERT INTO progress_history (id, user_id, book_id, version, progress, location, scroll_ratio, reading_duration, device_id, device_name, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          uuidv4(),
          session.user.id,
          bookId,
          currentProgress.version,
          currentProgress.progress,
          currentProgress.location,
          currentProgress.scrollRatio,
          currentProgress.readingDuration,
          currentProgress.deviceId,
          null,
          now
        );

      sqlite
        .prepare(
          `INSERT INTO progress_history (id, user_id, book_id, version, progress, location, scroll_ratio, reading_duration, device_id, device_name, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          uuidv4(),
          session.user.id,
          bookId,
          clientVersion,
          clientPayload.progress,
          clientPayload.location,
          clientPayload.scrollRatio,
          clientPayload.readingDuration,
          clientPayload.deviceId,
          null,
          now
        );

      // 根据冲突解决结果决定写入哪方数据
      const useClient = resolution.action === "keep_client";
      const finalProgress = useClient ? clientPayload.progress : currentProgress.progress;
      const finalLocation = useClient ? clientPayload.location : currentProgress.location;
      const finalScrollRatio = useClient ? clientPayload.scrollRatio : currentProgress.scrollRatio;
      const finalDeviceId = useClient ? clientPayload.deviceId : currentProgress.deviceId;
      // 阅读时长始终累加
      const finalReadingDuration = (currentProgress.readingDuration || 0) + (clientPayload.readingDuration || 0);

      sqlite
        .prepare(
          `UPDATE reading_progress SET version = ?, progress = ?, location = ?, scroll_ratio = ?, current_page = ?, total_pages = ?, reading_duration = ?, device_id = ?, last_read_at = ?, updated_at = ? WHERE user_id = ? AND book_id = ?`
        )
        .run(
          newVersion,
          finalProgress,
          finalLocation,
          finalScrollRatio,
          currentPage ?? currentProgress.currentPage,
          totalPages ?? currentProgress.totalPages,
          finalReadingDuration,
          finalDeviceId,
          now,
          now,
          session.user.id,
          bookId
        );

      const historyCount = sqlite
        .prepare("SELECT COUNT(*) as count FROM progress_history WHERE user_id = ? AND book_id = ?")
        .get(session.user.id, bookId) as { count: number };

      if (historyCount.count > MAX_HISTORY_COUNT) {
        const toDelete = historyCount.count - MAX_HISTORY_COUNT;
        const oldRecords = sqlite
          .prepare(
            `SELECT id FROM progress_history WHERE user_id = ? AND book_id = ? ORDER BY created_at ASC LIMIT ? OFFSET ?`
          )
          .all(session.user.id, bookId, toDelete, MAX_HISTORY_COUNT) as { id: string }[];

        for (const record of oldRecords) {
          sqlite.prepare("DELETE FROM progress_history WHERE id = ?").run(record.id);
        }
      }
    });

    transaction();

    logger.info("api", "[Progress Sync] Conflict resolved", {
      userId: session.user.id,
      bookId,
      action: resolution.action,
      reason: resolution.reason,
    });

    return NextResponse.json({
      status: "merged",
      serverVersion: newVersion,
      merged: true,
      resolution: {
        kept: resolution.action === "keep_client" ? "client" : "server",
        reason: resolution.reason,
        serverProgress: resolution.action === "keep_server" ? resolution.winner : undefined,
        clientProgress: resolution.action === "keep_client" ? resolution.winner : undefined,
      },
    });
  } catch (error) {
    logger.error("api", "[Progress Sync] Error:", error);
    return serverError("同步失败");
  }
}
