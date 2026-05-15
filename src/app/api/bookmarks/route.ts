import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bookmarks } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { findOwnedBook } from "@/lib/book-ownership";
import { badRequest, getAuthUserId, notFound, serverError, validateJson } from "@/lib/api-utils";
import { bookmarkSchema } from "@/lib/validations";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

export async function GET(req: NextRequest) {
  const authResult = await getAuthUserId();
  if (authResult.error) return authResult.error;

  const { searchParams } = new URL(req.url);
  const bookId = searchParams.get("bookId");

  if (!bookId) {
    return badRequest("缺少 bookId 参数");
  }

  const limitParam = searchParams.get("limit");
  const offsetParam = searchParams.get("offset");
  const limit = limitParam ? Math.min(parseInt(limitParam, 10) || DEFAULT_LIMIT, MAX_LIMIT) : DEFAULT_LIMIT;
  const offset = offsetParam ? Math.max(parseInt(offsetParam, 10) || 0, 0) : 0;

  try {
    const result = await db
      .select()
      .from(bookmarks)
      .where(
        and(
          eq(bookmarks.userId, authResult.userId),
          eq(bookmarks.bookId, bookId)
        )
      )
      .orderBy(desc(bookmarks.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({ bookmarks: result, hasMore: result.length === limit });
  } catch (error) {
    logger.error("api", "Get bookmarks error:", error);
    return serverError("获取书签失败");
  }
}

export async function POST(req: NextRequest) {
  const authResult = await getAuthUserId();
  if (authResult.error) return authResult.error;

  try {
    const validation = await validateJson(req, bookmarkSchema);
    if (validation.error) return validation.error;

    const { bookId, location, label, pageNumber, progress } = validation.data;
    const book = await findOwnedBook(bookId, authResult.userId);
    if (!book) {
      return notFound("书籍不存在");
    }

    const id = uuidv4();

    const locationStr = typeof location === "string" ? location : JSON.stringify(location);

    // Prevent duplicate bookmarks at the same location
    const existing = await db.query.bookmarks.findFirst({
      where: and(
        eq(bookmarks.userId, authResult.userId),
        eq(bookmarks.bookId, bookId),
        eq(bookmarks.location, locationStr)
      ),
    });

    if (existing) {
      return NextResponse.json({ bookmark: existing }, { status: 200 });
    }

    await db.insert(bookmarks)
      .values({
        id,
        userId: authResult.userId,
        bookId,
        location: locationStr,
        label: label || "未命名书签",
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
