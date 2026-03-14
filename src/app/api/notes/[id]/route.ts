import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notes } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { unauthorized, notFound, serverError } from "@/lib/api-utils";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorized();
  }

  const { id } = await params;

  try {
    const { content, color } = await req.json();

    const note = await db.query.notes.findFirst({
      where: and(eq(notes.id, id), eq(notes.userId, session.user.id)),
    });

    if (!note) {
      return notFound("笔记不存在");
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
    logger.error("api", "Update note error:", error);
    return serverError("更新笔记失败");
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorized();
  }

  const { id } = await params;

  try {
    const note = await db.query.notes.findFirst({
      where: and(eq(notes.id, id), eq(notes.userId, session.user.id)),
    });

    if (!note) {
      return notFound("笔记不存在");
    }

    await db.delete(notes).where(eq(notes.id, id));

    return NextResponse.json({ message: "删除成功" });
  } catch (error) {
    logger.error("api", "Delete note error:", error);
    return serverError("删除笔记失败");
  }
}
