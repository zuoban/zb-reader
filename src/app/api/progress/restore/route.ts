import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { progressHistory, readingProgress } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const { historyId } = await req.json();

    if (!historyId) {
      return NextResponse.json({ error: "缺少 historyId 参数" }, { status: 400 });
    }

    const historyRecord = await db.query.progressHistory.findFirst({
      where: and(
        eq(progressHistory.id, historyId),
        eq(progressHistory.userId, session.user.id)
      ),
    });

    if (!historyRecord) {
      return NextResponse.json({ error: "历史记录不存在" }, { status: 404 });
    }

    const now = new Date().toISOString();
    const newVersion = await db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(readingProgress)
        .where(
          and(
            eq(readingProgress.userId, session.user.id),
            eq(readingProgress.bookId, historyRecord.bookId)
          )
        )
        .limit(1);

      if (current) {
        await tx.insert(progressHistory).values({
          id: uuidv4(),
          userId: session.user.id,
          bookId: current.bookId,
          version: current.version,
          progress: current.progress,
          location: current.location,
          scrollRatio: current.scrollRatio,
          readingDuration: current.readingDuration,
          deviceId: current.deviceId,
          deviceName: null,
          createdAt: now,
        });

        const newVersion = current.version + 1;

        await tx
          .update(readingProgress)
          .set({
            version: newVersion,
            progress: historyRecord.progress,
            location: historyRecord.location,
            scrollRatio: historyRecord.scrollRatio,
            readingDuration: historyRecord.readingDuration,
            deviceId: historyRecord.deviceId,
            lastReadAt: now,
            updatedAt: now,
          })
          .where(
            and(
              eq(readingProgress.userId, session.user.id),
              eq(readingProgress.bookId, historyRecord.bookId)
            )
          );

        return newVersion;
      } else {
        const newVersion = 1;

        await tx.insert(readingProgress).values({
          id: uuidv4(),
          userId: session.user.id,
          bookId: historyRecord.bookId,
          version: newVersion,
          progress: historyRecord.progress,
          location: historyRecord.location,
          scrollRatio: historyRecord.scrollRatio,
          readingDuration: historyRecord.readingDuration,
          deviceId: historyRecord.deviceId,
          lastReadAt: now,
          createdAt: now,
          updatedAt: now,
        });

        return newVersion;
      }
    });

    logger.info("api", "[Progress Restore] Restored", {
      userId: session.user.id,
      bookId: historyRecord.bookId,
      historyId,
      newVersion,
    });

    return NextResponse.json({
      status: "restored",
      serverVersion: newVersion,
      progress: {
        progress: historyRecord.progress,
        location: historyRecord.location,
        scrollRatio: historyRecord.scrollRatio,
        readingDuration: historyRecord.readingDuration,
      },
    });
  } catch (error) {
    logger.error("api", "[Progress Restore] Error:", error);
    return NextResponse.json({ error: "恢复失败" }, { status: 500 });
  }
}
