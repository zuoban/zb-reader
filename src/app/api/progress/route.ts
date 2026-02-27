import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { readingProgress } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
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

    // 原子 upsert：INSERT ... ON CONFLICT(user_id, book_id) DO UPDATE SET ...
    // 避免先查后写的竞态，同时减少一次 DB 操作
    await db
      .insert(readingProgress)
      .values({
        id: uuidv4(),
        userId: session.user.id,
        bookId,
        progress: progress ?? 0,
        location: location ?? null,
        currentPage: currentPage ?? null,
        totalPages: totalPages ?? null,
        lastReadAt: now,
      })
      .onConflictDoUpdate({
        target: [readingProgress.userId, readingProgress.bookId],
        set: {
          progress: sql`COALESCE(${progress ?? null}, ${readingProgress.progress})`,
          location: sql`COALESCE(${location ?? null}, ${readingProgress.location})`,
          currentPage: sql`COALESCE(${currentPage ?? null}, ${readingProgress.currentPage})`,
          totalPages: sql`COALESCE(${totalPages ?? null}, ${readingProgress.totalPages})`,
          lastReadAt: now,
          updatedAt: now,
        },
      });

    // 直接返回请求参数，无需再查一次 DB
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
    console.error("Update progress error:", error);
    return NextResponse.json({ error: "更新进度失败" }, { status: 500 });
  }
}
