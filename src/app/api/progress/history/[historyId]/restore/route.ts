import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { readingProgress, progressHistory } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { unauthorized, notFound, serverError } from "@/lib/api-utils";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ historyId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorized();
  }

  const { historyId } = await params;

  try {
    const history = await db
      .select()
      .from(progressHistory)
      .where(
        and(
          eq(progressHistory.id, historyId),
          eq(progressHistory.userId, session.user.id)
        )
      )
      .limit(1);

    if (history.length === 0) {
      return notFound("历史记录不存在");
    }

    const historyItem = history[0];

    const existing = await db
      .select()
      .from(readingProgress)
      .where(
        and(
          eq(readingProgress.userId, session.user.id),
          eq(readingProgress.bookId, historyItem.bookId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(readingProgress)
        .set({
          progress: historyItem.progress,
          location: historyItem.location,
          scrollRatio: historyItem.scrollRatio,
          version: historyItem.version,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(readingProgress.id, existing[0].id));
    } else {
      await db.insert(readingProgress).values({
        id: crypto.randomUUID(),
        userId: session.user.id,
        bookId: historyItem.bookId,
        progress: historyItem.progress,
        location: historyItem.location,
        scrollRatio: historyItem.scrollRatio,
        version: historyItem.version,
      });
    }

    return NextResponse.json({
      success: true,
      location: historyItem.location,
      progress: historyItem.progress,
    });
  } catch (error) {
    logger.error("api", "[Progress History Restore] Error:", error);
    return serverError("恢复失败");
  }
}
