import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notes } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { findOwnedBook } from "@/lib/book-ownership";
import { unauthorized, badRequest, notFound, serverError, validateJson } from "@/lib/api-utils";
import { noteSchema } from "@/lib/validations";

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
      .from(notes)
      .where(
        and(eq(notes.userId, session.user.id), eq(notes.bookId, bookId))
      )
      .orderBy(desc(notes.createdAt));

    return NextResponse.json({ notes: result });
  } catch (error) {
    logger.error("api", "Get notes error:", error);
    return serverError("获取笔记失败");
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorized();
  }

  try {
    const validation = await validateJson(req, noteSchema);
    if (validation.error) return validation.error;

    const { bookId, location, selectedText, content, color, pageNumber, progress } = validation.data;
    const book = await findOwnedBook(bookId, session.user.id);
    if (!book) {
      return notFound("书籍不存在");
    }

    const id = uuidv4();

    await db.insert(notes)
      .values({
        id,
        userId: session.user.id,
        bookId,
        location: typeof location === "string" ? location : JSON.stringify(location),
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
