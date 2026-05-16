import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notes } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { formatDbTimestamp, getAuthUserId, notFound, serverError, validateJson } from "@/lib/api-utils";
import { noteUpdateSchema } from "@/lib/validations";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await getAuthUserId();
  if (authResult.error) return authResult.error;

  const { id } = await params;

  try {
    const validation = await validateJson(req, noteUpdateSchema);
    if (validation.error) return validation.error;
    const { content, color } = validation.data;

    const note = await db.query.notes.findFirst({
      where: and(eq(notes.id, id), eq(notes.userId, authResult.userId)),
    });

    if (!note) {
      return notFound("笔记不存在");
    }

    const now = formatDbTimestamp();

    await db
      .update(notes)
      .set({
        ...(content !== undefined && { content }),
        ...(color !== undefined && { color }),
        updatedAt: now,
      })
      .where(eq(notes.id, id));

    // 直接构造返回对象,避免再次查询数据库
    const updated = {
      ...note,
      ...(content !== undefined && { content }),
      ...(color !== undefined && { color }),
      updatedAt: now,
    };

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
  const authResult = await getAuthUserId();
  if (authResult.error) return authResult.error;

  const { id } = await params;

  try {
    const note = await db.query.notes.findFirst({
      where: and(eq(notes.id, id), eq(notes.userId, authResult.userId)),
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
