import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notes } from "@/lib/db/schema";
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
    const { content, color } = await req.json();

    const note = await db.query.notes.findFirst({
      where: and(eq(notes.id, id), eq(notes.userId, session.user.id)),
    });

    if (!note) {
      return NextResponse.json({ error: "笔记不存在" }, { status: 404 });
    }

    const now = new Date().toISOString().replace("T", " ").replace("Z", "");

    await db
      .update(notes)
      .set({
        ...(content !== undefined && { content }),
        ...(color !== undefined && { color }),
        updatedAt: now,
      })
      .where(eq(notes.id, id));

    const updated = await db.query.notes.findFirst({
      where: eq(notes.id, id),
    });

    return NextResponse.json({ note: updated });
  } catch (error) {
    console.error("Update note error:", error);
    return NextResponse.json({ error: "更新笔记失败" }, { status: 500 });
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
    const note = await db.query.notes.findFirst({
      where: and(eq(notes.id, id), eq(notes.userId, session.user.id)),
    });

    if (!note) {
      return NextResponse.json({ error: "笔记不存在" }, { status: 404 });
    }

    await db.delete(notes).where(eq(notes.id, id));

    return NextResponse.json({ message: "删除成功" });
  } catch (error) {
    console.error("Delete note error:", error);
    return NextResponse.json({ error: "删除笔记失败" }, { status: 500 });
  }
}
