import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { readingProgress } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { generateToken, ProgressTokenPayload } from "@/lib/progress-token";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const bookId = searchParams.get("bookId");

  if (!bookId) {
    return NextResponse.json({ error: "缺少 bookId 参数" }, { status: 400 });
  }

  try {
    const progress = await db.query.readingProgress.findFirst({
      where: and(
        eq(readingProgress.userId, session.user.id),
        eq(readingProgress.bookId, bookId)
      ),
    });

    let serverToken: string | null = null;
    if (progress) {
      const tokenPayload: ProgressTokenPayload = {
        userId: session.user.id,
        bookId,
        timestamp: progress.updatedAt,
      };
      serverToken = generateToken(tokenPayload);
    }

    return NextResponse.json({
      progress,
      serverToken,
    });
  } catch (error) {
    logger.error("api", "Get progress error:", error);
    return NextResponse.json({ error: "获取进度失败" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const {
      bookId,
      progress,
      location,
      currentPage,
      totalPages,
      clientToken,
    } = await req.json();

    logger.debug("api", "[Progress API PUT]", {
      userId: session.user.id,
      bookId,
      progress,
      hasToken: !!clientToken,
    });

    if (!bookId) {
      return NextResponse.json({ error: "缺少 bookId 参数" }, { status: 400 });
    }

    if (!clientToken) {
      return NextResponse.json({ error: "缺少 clientToken 参数" }, { status: 400 });
    }

    const { verifyToken, isTokenNewer } = await import("@/lib/progress-token");

    const tokenPayload = verifyToken(clientToken);
    if (!tokenPayload) {
      return NextResponse.json({ error: "无效的 token" }, { status: 400 });
    }

    const currentProgress = await db.query.readingProgress.findFirst({
      where: and(
        eq(readingProgress.userId, session.user.id),
        eq(readingProgress.bookId, bookId)
      ),
    });

    const now = new Date().toISOString();

    if (currentProgress) {
      const isNewer = isTokenNewer(clientToken, currentProgress.updatedAt);
      logger.debug("api", "[Progress] Token comparison", {
        tokenTimestamp: tokenPayload.timestamp,
        dbTimestamp: currentProgress.updatedAt,
        isNewer,
      });

      if (!isNewer) {
        return NextResponse.json({
          error: "进度冲突",
          conflict: true,
          latestTimestamp: currentProgress.updatedAt,
          latestProgress: currentProgress.progress,
        }, { status: 409 });
      }
    }

    if (currentProgress) {
      await db.update(readingProgress)
        .set({
          progress,
          location,
          currentPage,
          totalPages,
          lastReadAt: now,
          updatedAt: now,
        })
        .where(and(
          eq(readingProgress.userId, session.user.id),
          eq(readingProgress.bookId, bookId)
        ));
    } else {
      await db.insert(readingProgress).values({
        id: uuidv4(),
        userId: session.user.id,
        bookId,
        progress: progress ?? 0,
        location: location ?? null,
        currentPage: currentPage ?? null,
        totalPages: totalPages ?? null,
        lastReadAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }

    return NextResponse.json({
      progress: {
        userId: session.user.id,
        bookId,
        progress: progress ?? 0,
        location: location ?? null,
        currentPage: currentPage ?? null,
        totalPages: totalPages ?? null,
        lastReadAt: now,
      },
    });
  } catch (error) {
    logger.error("api", "Update progress error:", error);
    return NextResponse.json({ error: "更新进度失败" }, { status: 500 });
  }
}
