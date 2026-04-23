import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { books } from "@/lib/db/schema";
import { deleteBookFile, deleteCoverImage } from "@/lib/storage";
import { logger } from "@/lib/logger";
import { badRequest, notFound, serverError, unauthorized } from "@/lib/api-utils";

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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorized();
  }

  const { id } = await params;

  try {
    const payload = await req.json();
    const rawCategory = typeof payload.category === "string" ? payload.category.trim() : "";

    if (rawCategory.length > 40) {
      return badRequest("分类名称不能超过 40 个字符");
    }

    const book = await db.query.books.findFirst({
      where: and(eq(books.id, id), eq(books.uploaderId, session.user.id)),
    });

    if (!book) {
      return notFound("书籍不存在");
    }

    await db
      .update(books)
      .set({
        category: rawCategory || null,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(books.id, id), eq(books.uploaderId, session.user.id)));

    const updatedBook = await db.query.books.findFirst({
      where: and(eq(books.id, id), eq(books.uploaderId, session.user.id)),
    });

    return NextResponse.json({ book: updatedBook });
  } catch (error) {
    logger.error("book", "Failed to update book", error);
    return serverError("更新书籍失败");
  }
}
