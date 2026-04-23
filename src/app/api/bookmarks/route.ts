import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { bookmarks } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { unauthorized, badRequest, serverError, validateJson } from "@/lib/api-utils";
import { bookmarkSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorized();
  }

  const { searchParams } = new URL(req.url);
  const bookId = searchParams.get("bookId");

  if (!bookId) {
    return badRequest("缺少 bookId 参数");
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
    return serverError("获取书签失败");
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorized();
  }

  try {
    const validation = await validateJson(req, bookmarkSchema);
    if (validation.error) return validation.error;

    const { bookId, location, label, pageNumber, progress } = validation.data;

    const id = uuidv4();

    await db.insert(bookmarks)
      .values({
        id,
        userId: session.user.id,
        bookId,
        location: typeof location === "string" ? location : JSON.stringify(location),
        label: label || `书签 ${new Date().toLocaleString("zh-CN")}`,
        pageNumber,
        progress,
      });

    const bookmark = await db.query.bookmarks.findFirst({
      where: eq(bookmarks.id, id),
    });

    return NextResponse.json({ bookmark }, { status: 201 });
  } catch (error) {
    logger.error("api", "Create bookmark error:", error);
    return serverError("创建书签失败");
  }
}
