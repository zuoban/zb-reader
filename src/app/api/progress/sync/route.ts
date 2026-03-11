import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, getSqlite } from "@/lib/db";
import { readingProgress, books } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { resolveConflict, type ClientProgress } from "@/lib/conflict-resolver";

const MAX_HISTORY_COUNT = 50;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const body = await req.json();
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
    } = body;

    logger.debug("api", "[Progress Sync] Request", {
      userId: session.user.id,
      bookId,
      clientVersion,
      progress,
    });

    if (!bookId) {
      return NextResponse.json({ error: "缺少 bookId 参数" }, { status: 400 });
    }

    if (typeof clientVersion !== "number") {
      return NextResponse.json({ error: "缺少 clientVersion 参数" }, { status: 400 });
    }

    const bookExists = await db.query.books.findFirst({
      where: eq(books.id, bookId),
    });

    if (!bookExists) {
      return NextResponse.json({ error: "书籍不存在" }, { status: 404 });
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

      await db
        .update(readingProgress)
        .set({
          version: newVersion,
          progress: clientPayload.progress,
          location: clientPayload.location,
          scrollRatio: clientPayload.scrollRatio,
          currentPage: currentPage ?? null,
          totalPages: totalPages ?? null,
          readingDuration: clientPayload.readingDuration,
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
    const winner = resolution.winner;

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

      const winnerLocation = "location" in winner ? winner.location : currentProgress.location;
      const winnerScrollRatio = "scrollRatio" in winner ? winner.scrollRatio : currentProgress.scrollRatio;
      const winnerReadingDuration = "readingDuration" in winner ? winner.readingDuration : currentProgress.readingDuration;
      const winnerDeviceId = "deviceId" in winner ? winner.deviceId : currentProgress.deviceId;

      sqlite
        .prepare(
          `UPDATE reading_progress SET version = ?, progress = ?, location = ?, scroll_ratio = ?, current_page = ?, total_pages = ?, reading_duration = ?, device_id = ?, last_read_at = ?, updated_at = ? WHERE user_id = ? AND book_id = ?`
        )
        .run(
          newVersion,
          winner.progress,
          winnerLocation,
          winnerScrollRatio,
          currentPage ?? currentProgress.currentPage,
          totalPages ?? currentProgress.totalPages,
          winnerReadingDuration,
          winnerDeviceId,
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
      },
    });
  } catch (error) {
    logger.error("api", "[Progress Sync] Error:", error);
    return NextResponse.json({ error: "同步失败" }, { status: 500 });
  }
}
