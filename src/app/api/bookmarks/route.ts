import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { bookmarks } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
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
    const result = await db
      .select()
      .from(bookmarks)
      .where(
        and(
          eq(bookmarks.userId, session.user.id),
          eq(bookmarks.bookId, bookId)
        )
      )
      .orderBy(desc(bookmarks.createdAt));

    return NextResponse.json({ bookmarks: result });
  } catch (error) {
    logger.error("api", "Get bookmarks error:", error);
    return NextResponse.json({ error: "获取书签失败" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const { bookId, location, label, pageNumber, progress } = await req.json();

    if (!bookId || !location) {
      return NextResponse.json(
        { error: "缺少必要参数" },
        { status: 400 }
      );
    }

    const id = uuidv4();

    const [bookmark] = await db.insert(bookmarks)
      .values({
        id,
        userId: session.user.id,
        bookId,
        location: typeof location === "string" ? location : JSON.stringify(location),
        label: label || `书签 ${new Date().toLocaleString("zh-CN")}`,
        pageNumber,
        progress,
      })
      .returning();

    return NextResponse.json({ bookmark }, { status: 201 });
  } catch (error) {
    logger.error("api", "Create bookmark error:", error);
    return NextResponse.json({ error: "创建书签失败" }, { status: 500 });
  }
}
