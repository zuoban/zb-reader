import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { bookmarks, books, notes, readingProgress } from "@/lib/db/schema";
import { badRequest, getAuthUserId, notFound, serverError } from "@/lib/api-utils";
import { logger } from "@/lib/logger";
import { progressBookIdSchema } from "@/lib/validations";

const INITIAL_READER_ITEMS_LIMIT = 100;

export async function GET(req: NextRequest) {
  const authResult = await getAuthUserId();
  if (authResult.error) return authResult.error;
  const { userId } = authResult;

  const { searchParams } = new URL(req.url);
  const parsed = progressBookIdSchema.safeParse({
    bookId: searchParams.get("bookId") ?? "",
  });

  if (!parsed.success) {
    return badRequest(
      searchParams.has("bookId")
        ? parsed.error.issues[0]?.message || "参数错误"
        : "缺少 bookId 参数"
    );
  }

  const { bookId } = parsed.data;

  try {
    const book = await db.query.books.findFirst({
      where: and(eq(books.id, bookId), eq(books.uploaderId, userId)),
    });

    if (!book) {
      return notFound("书籍不存在");
    }

    const [progress, bookmarkRows, noteRows] = await Promise.all([
      db.query.readingProgress.findFirst({
        where: and(
          eq(readingProgress.userId, userId),
          eq(readingProgress.bookId, bookId)
        ),
      }),
      db
        .select()
        .from(bookmarks)
        .where(and(eq(bookmarks.userId, userId), eq(bookmarks.bookId, bookId)))
        .orderBy(desc(bookmarks.createdAt))
        .limit(INITIAL_READER_ITEMS_LIMIT),
      db
        .select()
        .from(notes)
        .where(and(eq(notes.userId, userId), eq(notes.bookId, bookId)))
        .orderBy(desc(notes.createdAt))
        .limit(INITIAL_READER_ITEMS_LIMIT),
    ]);

    return NextResponse.json({
      book,
      progress: progress
        ? {
            progress: progress.progress,
            location: progress.location,
          }
        : null,
      bookmarks: bookmarkRows,
      notes: noteRows,
    });
  } catch (error) {
    logger.error("reader-bootstrap", "Failed to load reader bootstrap data", error);
    return serverError("加载阅读数据失败");
  }
}
