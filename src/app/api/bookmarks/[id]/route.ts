import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bookmarks } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { formatDbTimestamp, getAuthUserId, notFound, serverError, validateJson } from "@/lib/api-utils";
import { bookmarkUpdateSchema } from "@/lib/validations";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await getAuthUserId();
  if (authResult.error) return authResult.error;

  const { id } = await params;

  try {
    const validation = await validateJson(req, bookmarkUpdateSchema);
    if (validation.error) return validation.error;
    const { label } = validation.data;

    const bookmark = await db.query.bookmarks.findFirst({
      where: and(
        eq(bookmarks.id, id),
        eq(bookmarks.userId, authResult.userId)
      ),
    });

    if (!bookmark) {
      return notFound("书签不存在");
    }

    const now = formatDbTimestamp();

    await db
      .update(bookmarks)
      .set({ label, updatedAt: now })
      .where(eq(bookmarks.id, id));

    // 直接构造返回对象,避免再次查询数据库
    const updated = {
      ...bookmark,
      label,
      updatedAt: now,
    };

    return NextResponse.json({ bookmark: updated });
  } catch (error) {
    logger.error("api", "Update bookmark error:", error);
    return serverError("更新书签失败");
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
    const bookmark = await db.query.bookmarks.findFirst({
      where: and(
        eq(bookmarks.id, id),
        eq(bookmarks.userId, authResult.userId)
      ),
    });

    if (!bookmark) {
      return notFound("书签不存在");
    }

    await db.delete(bookmarks).where(eq(bookmarks.id, id));

    return NextResponse.json({ message: "删除成功" });
  } catch (error) {
    logger.error("api", "Delete bookmark error:", error);
    return serverError("删除书签失败");
  }
}
