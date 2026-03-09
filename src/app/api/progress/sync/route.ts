import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { readingProgress, progressHistory } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { resolveConflict, type ClientProgress } from "@/lib/conflict-resolver";
import { getDeviceName } from "@/lib/device";

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

    await db.transaction(async (tx) => {
      await tx.insert(progressHistory).values({
        id: uuidv4(),
        userId: session.user.id,
        bookId,
        version: currentProgress.version,
        progress: currentProgress.progress,
        location: currentProgress.location,
        scrollRatio: currentProgress.scrollRatio,
        readingDuration: currentProgress.readingDuration,
        deviceId: currentProgress.deviceId,
        deviceName: null,
        createdAt: now,
      });

      await tx.insert(progressHistory).values({
        id: uuidv4(),
        userId: session.user.id,
        bookId,
        version: clientVersion,
        progress: clientPayload.progress,
        location: clientPayload.location,
        scrollRatio: clientPayload.scrollRatio,
        readingDuration: clientPayload.readingDuration,
        deviceId: clientPayload.deviceId,
        deviceName: null,
        createdAt: now,
      });

      const winnerLocation = "location" in winner ? winner.location : currentProgress.location;
      const winnerScrollRatio = "scrollRatio" in winner ? winner.scrollRatio : currentProgress.scrollRatio;
      const winnerReadingDuration = "readingDuration" in winner ? winner.readingDuration : currentProgress.readingDuration;
      const winnerDeviceId = "deviceId" in winner ? winner.deviceId : currentProgress.deviceId;

      await tx
        .update(readingProgress)
        .set({
          version: newVersion,
          progress: winner.progress,
          location: winnerLocation,
          scrollRatio: winnerScrollRatio,
          currentPage: currentPage ?? currentProgress.currentPage,
          totalPages: totalPages ?? currentProgress.totalPages,
          readingDuration: winnerReadingDuration,
          deviceId: winnerDeviceId,
          lastReadAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(readingProgress.userId, session.user.id),
            eq(readingProgress.bookId, bookId)
          )
        );

      const historyCount = await tx
        .select({ count: progressHistory.id })
        .from(progressHistory)
        .where(
          and(
            eq(progressHistory.userId, session.user.id),
            eq(progressHistory.bookId, bookId)
          )
        );

      if (historyCount.length > MAX_HISTORY_COUNT) {
        const toDelete = historyCount.length - MAX_HISTORY_COUNT;
        const oldRecords = await tx
          .select({ id: progressHistory.id })
          .from(progressHistory)
          .where(
            and(
              eq(progressHistory.userId, session.user.id),
              eq(progressHistory.bookId, bookId)
            )
          )
          .orderBy(desc(progressHistory.createdAt))
          .limit(toDelete)
          .offset(MAX_HISTORY_COUNT);

        for (const record of oldRecords) {
          await tx
            .delete(progressHistory)
            .where(eq(progressHistory.id, record.id));
        }
      }
    });

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
