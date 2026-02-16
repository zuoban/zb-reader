import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notes } from "@/lib/db/schema";
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
      .from(notes)
      .where(
        and(eq(notes.userId, session.user.id), eq(notes.bookId, bookId))
      )
      .orderBy(desc(notes.createdAt));

    return NextResponse.json({ notes: result });
  } catch (error) {
    console.error("Get notes error:", error);
    return NextResponse.json({ error: "获取笔记失败" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const { bookId, location, selectedText, content, color, pageNumber, progress } =
      await req.json();

    if (!bookId || !location) {
      return NextResponse.json(
        { error: "缺少必要参数" },
        { status: 400 }
      );
    }

    const id = uuidv4();

    await db.insert(notes).values({
      id,
      userId: session.user.id,
      bookId,
      location: typeof location === "string" ? location : JSON.stringify(location),
      selectedText,
      content,
      color: color || "yellow",
      pageNumber,
      progress,
    });

    const note = await db.query.notes.findFirst({
      where: eq(notes.id, id),
    });

    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    console.error("Create note error:", error);
    return NextResponse.json({ error: "创建笔记失败" }, { status: 500 });
  }
}
