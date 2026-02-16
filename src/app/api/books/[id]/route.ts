import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { books } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { deleteBookFile, deleteCoverImage } from "@/lib/storage";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const book = await db.query.books.findFirst({
      where: and(eq(books.id, id), eq(books.uploaderId, session.user.id)),
    });

    if (!book) {
      return NextResponse.json({ error: "书籍不存在" }, { status: 404 });
    }

    return NextResponse.json({ book });
  } catch (error) {
    console.error("Get book error:", error);
    return NextResponse.json({ error: "获取书籍失败" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const book = await db.query.books.findFirst({
      where: and(eq(books.id, id), eq(books.uploaderId, session.user.id)),
    });

    if (!book) {
      return NextResponse.json({ error: "书籍不存在" }, { status: 404 });
    }

    // Delete file
    deleteBookFile(book.filePath);
    if (book.cover) {
      deleteCoverImage(book.cover);
    }

    // Delete from database
    await db.delete(books).where(eq(books.id, id));

    return NextResponse.json({ message: "删除成功" });
  } catch (error) {
    console.error("Delete book error:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
