import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notes } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { findOwnedBook } from "@/lib/book-ownership";
import { badRequest, getAuthUserId, notFound, serverError, validateJson } from "@/lib/api-utils";
import { noteSchema } from "@/lib/validations";

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
      .from(notes)
      .where(
        and(eq(notes.userId, authResult.userId), eq(notes.bookId, bookId))
      )
      .orderBy(desc(notes.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({ notes: result, hasMore: result.length === limit });
  } catch (error) {
    logger.error("api", "Get notes error:", error);
    return serverError("获取笔记失败");
  }
}

export async function POST(req: NextRequest) {
  const authResult = await getAuthUserId();
  if (authResult.error) return authResult.error;

  try {
    const validation = await validateJson(req, noteSchema);
    if (validation.error) return validation.error;

    const { bookId, location, selectedText, content, color, pageNumber, progress } = validation.data;
    const book = await findOwnedBook(bookId, authResult.userId);
    if (!book) {
      return notFound("书籍不存在");
    }

    const id = uuidv4();
    const locationStr = typeof location === "string" ? location : JSON.stringify(location);

    // Prevent duplicate notes at the same location
    const existing = await db.query.notes.findFirst({
      where: and(
        eq(notes.userId, authResult.userId),
        eq(notes.bookId, bookId),
        eq(notes.location, locationStr)
      ),
    });

    if (existing) {
      return NextResponse.json({ note: existing }, { status: 200 });
    }

    await db.insert(notes)
      .values({
        id,
        userId: authResult.userId,
        bookId,
        location: locationStr,
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
    logger.error("api", "Create note error:", error);
    return serverError("创建笔记失败");
  }
}
