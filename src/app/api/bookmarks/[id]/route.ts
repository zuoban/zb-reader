import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { bookmarks } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const { label } = await req.json();

    const bookmark = await db.query.bookmarks.findFirst({
      where: and(
        eq(bookmarks.id, id),
        eq(bookmarks.userId, session.user.id)
      ),
    });

    if (!bookmark) {
      return NextResponse.json({ error: "书签不存在" }, { status: 404 });
    }

    const now = new Date().toISOString().replace("T", " ").replace("Z", "");

    await db
      .update(bookmarks)
      .set({ label, updatedAt: now })
      .where(eq(bookmarks.id, id));

    const updated = await db.query.bookmarks.findFirst({
      where: eq(bookmarks.id, id),
    });

    return NextResponse.json({ bookmark: updated });
  } catch (error) {
    console.error("Update bookmark error:", error);
    return NextResponse.json({ error: "更新书签失败" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const bookmark = await db.query.bookmarks.findFirst({
      where: and(
        eq(bookmarks.id, id),
        eq(bookmarks.userId, session.user.id)
      ),
    });

    if (!bookmark) {
      return NextResponse.json({ error: "书签不存在" }, { status: 404 });
    }

    await db.delete(bookmarks).where(eq(bookmarks.id, id));

    return NextResponse.json({ message: "删除成功" });
  } catch (error) {
    console.error("Delete bookmark error:", error);
    return NextResponse.json({ error: "删除书签失败" }, { status: 500 });
  }
}
