import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { bookmarks } from "@/lib/db/schema";
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
    const { label } = await req.json();

    const bookmark = await db.query.bookmarks.findFirst({
      where: and(
        eq(bookmarks.id, id),
        eq(bookmarks.userId, session.user.id)
      ),
    });

    if (!bookmark) {
      return notFound("书签不存在");
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
    logger.error("api", "Update bookmark error:", error);
    return serverError("更新书签失败");
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
    const bookmark = await db.query.bookmarks.findFirst({
      where: and(
        eq(bookmarks.id, id),
        eq(bookmarks.userId, session.user.id)
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
