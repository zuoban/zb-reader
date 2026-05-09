import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { db, getSqlite } from "@/lib/db";
import { readingProgress } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { resolveConflict, type ClientProgress } from "@/lib/conflict-resolver";
import { findOwnedBook } from "@/lib/book-ownership";
import { serverError, validateJson, getAuthUserId } from "@/lib/api-utils";
import { progressSchema } from "@/lib/validations";
import { z } from "zod";

const MAX_HISTORY_COUNT = 50;

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
    const sqlite = getSqlite();

    for (const item of items) {
      const {
        syncId,
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
          serverVersion: currentProgress.version,
          merged: false,
          idempotent: true,
        });
        continue;
      }

      const now = new Date().toISOString();

      if (!currentProgress) {
        const newVersion = 1;
        await db.insert(readingProgress).values({
          id: uuidv4(),
          userId: userId,
          bookId,
          version: newVersion,
          progress: progress ?? 0,
          location: location ?? null,
          scrollRatio: scrollRatio ?? null,
          currentPage: currentPage ?? null,
          totalPages: totalPages ?? null,
          readingDuration: readingDuration ?? 0,
          deviceId: deviceId ?? null,
          lastSyncId: syncId ?? null,
          lastReadAt: now,
          createdAt: now,
          updatedAt: now,
        });

        results.push({
          bookId,
          status: "created",
          serverVersion: newVersion,
          merged: false,
        });
        continue;
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
          serverVersion: newVersion,
          merged: false,
        });
        continue;
      }

      const resolution = resolveConflict(currentProgress, clientPayload);
      const newVersion = currentProgress.version + 1;
      
      const transaction = sqlite.transaction(() => {
        sqlite
          .prepare(
            `INSERT INTO progress_history (id, user_id, book_id, version, progress, location, scroll_ratio, reading_duration, device_id, device_name, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            uuidv4(),
            userId,
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
            userId,
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

        const useClient = resolution.action === "keep_client";
        const finalProgress = useClient ? clientPayload.progress : currentProgress.progress;
        const finalLocation = useClient ? clientPayload.location : currentProgress.location;
        const finalScrollRatio = useClient ? clientPayload.scrollRatio : currentProgress.scrollRatio;
        const finalDeviceId = useClient ? clientPayload.deviceId : currentProgress.deviceId;
        const finalReadingDuration = (currentProgress.readingDuration || 0) + (clientPayload.readingDuration || 0);

        sqlite
          .prepare(
            `UPDATE reading_progress SET version = ?, progress = ?, location = ?, scroll_ratio = ?, current_page = ?, total_pages = ?, reading_duration = ?, device_id = ?, last_sync_id = ?, last_read_at = ?, updated_at = ? WHERE user_id = ? AND book_id = ?`
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
            syncId ?? null,
            now,
            now,
            userId,
            bookId
          );

        const historyCount = sqlite
          .prepare("SELECT COUNT(*) as count FROM progress_history WHERE user_id = ? AND book_id = ?")
          .get(userId, bookId) as { count: number };

        if (historyCount.count > MAX_HISTORY_COUNT) {
          const toDelete = historyCount.count - MAX_HISTORY_COUNT;
          sqlite
            .prepare(
              `DELETE FROM progress_history WHERE id IN (
                SELECT id FROM progress_history
                WHERE user_id = ? AND book_id = ?
                ORDER BY created_at ASC
                LIMIT ? OFFSET ?
              )`
            )
            .run(userId, bookId, toDelete, MAX_HISTORY_COUNT);
        }
      });

      transaction();

      results.push({
        bookId,
        status: "merged",
        serverVersion: newVersion,
        merged: true,
        resolution: {
          kept: resolution.action === "keep_client" ? "client" : "server",
          reason: resolution.reason,
        },
      });
    }

    return NextResponse.json({ results });
  } catch (error) {
    logger.error("api", "[Progress Batch Sync] Error:", error);
    return serverError("批量同步失败");
  }
}
