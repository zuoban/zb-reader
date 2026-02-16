import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { readingProgress } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

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

    return NextResponse.json({ progress: progress || null });
  } catch (error) {
    console.error("Get progress error:", error);
    return NextResponse.json({ error: "获取进度失败" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const { bookId, progress, location, currentPage, totalPages } =
      await req.json();

    if (!bookId) {
      return NextResponse.json(
        { error: "缺少 bookId 参数" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString().replace("T", " ").replace("Z", "");

    const existing = await db.query.readingProgress.findFirst({
      where: and(
        eq(readingProgress.userId, session.user.id),
        eq(readingProgress.bookId, bookId)
      ),
    });

    if (existing) {
      await db
        .update(readingProgress)
        .set({
          progress: progress ?? existing.progress,
          location: location ?? existing.location,
          currentPage: currentPage ?? existing.currentPage,
          totalPages: totalPages ?? existing.totalPages,
          lastReadAt: now,
          updatedAt: now,
        })
        .where(eq(readingProgress.id, existing.id));
    } else {
      await db.insert(readingProgress).values({
        id: uuidv4(),
        userId: session.user.id,
        bookId,
        progress: progress ?? 0,
        location,
        currentPage,
        totalPages,
        lastReadAt: now,
      });
    }

    const updated = await db.query.readingProgress.findFirst({
      where: and(
        eq(readingProgress.userId, session.user.id),
        eq(readingProgress.bookId, bookId)
      ),
    });

    return NextResponse.json({ progress: updated });
  } catch (error) {
    console.error("Update progress error:", error);
    return NextResponse.json({ error: "更新进度失败" }, { status: 500 });
  }
}
