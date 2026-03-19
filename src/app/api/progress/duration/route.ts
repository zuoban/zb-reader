import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { readingProgress } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { unauthorized, badRequest, serverError } from "@/lib/api-utils";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorized();
  }

  try {
    const body = await req.json();
    const { bookId, readingDuration } = body;

    if (!bookId) {
      return badRequest("缺少 bookId 参数");
    }

    if (typeof readingDuration !== "number" || readingDuration < 0) {
      return badRequest("阅读时长必须为非负数");
    }

    const currentProgress = await db.query.readingProgress.findFirst({
      where: and(
        eq(readingProgress.userId, session.user.id),
        eq(readingProgress.bookId, bookId)
      ),
    });

    const now = new Date().toISOString();

    if (!currentProgress) {
      await db.insert(readingProgress).values({
        id: uuidv4(),
        userId: session.user.id,
        bookId,
        version: 1,
        progress: 0,
        location: null,
        scrollRatio: null,
        currentPage: null,
        totalPages: null,
        readingDuration: readingDuration,
        deviceId: null,
        lastReadAt: now,
        createdAt: now,
        updatedAt: now,
      });

      return NextResponse.json({
        success: true,
        readingDuration: readingDuration,
      });
    }

    await db
      .update(readingProgress)
      .set({
        readingDuration: readingDuration,
        updatedAt: now,
      })
      .where(
        and(
          eq(readingProgress.userId, session.user.id),
          eq(readingProgress.bookId, bookId)
        )
      );

    return NextResponse.json({
      success: true,
      readingDuration: readingDuration,
    });
  } catch (error) {
    logger.error("api", "[Reading Duration] Error:", error);
    return serverError("设置阅读时长失败");
  }
}