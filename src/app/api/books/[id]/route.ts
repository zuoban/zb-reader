import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { books } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { deleteBookFile, deleteCoverImage } from "@/lib/storage";
import { logger } from "@/lib/logger";
import { unauthorized, notFound, serverError } from "@/lib/api-utils";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorized();
  }

  const { id } = await params;

  try {
    const book = await db.query.books.findFirst({
      where: and(eq(books.id, id), eq(books.uploaderId, session.user.id)),
    });

    if (!book) {
      return notFound("书籍不存在");
    }

    return NextResponse.json({ book });
  } catch (error) {
    logger.error("book", "Failed to get book", error);
    return serverError("获取书籍失败");
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
    const book = await db.query.books.findFirst({
      where: and(eq(books.id, id), eq(books.uploaderId, session.user.id)),
    });

    if (!book) {
      return notFound("书籍不存在");
    }

    deleteBookFile(book.filePath);
    if (book.cover) {
      deleteCoverImage(book.cover);
    }

    await db.delete(books).where(eq(books.id, id));

    return NextResponse.json({ message: "删除成功" });
  } catch (error) {
    logger.error("book", "Failed to delete book", error);
    return serverError("删除失败");
  }
}
