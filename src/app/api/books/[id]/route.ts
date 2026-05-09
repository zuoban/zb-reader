import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { books } from "@/lib/db/schema";
import { deleteBookFile, deleteCoverImage } from "@/lib/storage";
import { invalidateCoverCache } from "@/lib/cover-cache";
import { logger } from "@/lib/logger";
import { notFound, serverError, getAuthUserId, validateJson } from "@/lib/api-utils";
import { bookCategorySchema } from "@/lib/validations";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await getAuthUserId();
  if (authResult.error) return authResult.error;
  const { userId } = authResult;

  const { id } = await params;

  try {
    const book = await db.query.books.findFirst({
      where: and(eq(books.id, id), eq(books.uploaderId, userId)),
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
  const authResult = await getAuthUserId();
  if (authResult.error) return authResult.error;
  const { userId } = authResult;

  const { id } = await params;

  try {
    const book = await db.query.books.findFirst({
      where: and(eq(books.id, id), eq(books.uploaderId, userId)),
    });

    if (!book) {
      return notFound("书籍不存在");
    }

    deleteBookFile(book.filePath);
    if (book.cover) {
      deleteCoverImage(book.cover);
      invalidateCoverCache(book.cover);
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
  const authResult = await getAuthUserId();
  if (authResult.error) return authResult.error;
  const { userId } = authResult;

  const { id } = await params;

  try {
    const validation = await validateJson(req, bookCategorySchema);
    if (validation.error) return validation.error;
    const { category } = validation.data;

    const rawCategory = typeof category === "string" ? category.trim() : "";

    const book = await db.query.books.findFirst({
      where: and(eq(books.id, id), eq(books.uploaderId, userId)),
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
      .where(and(eq(books.id, id), eq(books.uploaderId, userId)));

    return NextResponse.json({
      book: { ...book, category: rawCategory || null, updatedAt: new Date().toISOString() },
    });
  } catch (error) {
    logger.error("book", "Failed to update book", error);
    return serverError("更新书籍失败");
  }
}
