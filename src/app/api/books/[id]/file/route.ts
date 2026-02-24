import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { books } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getBookFilePath, bookFileExists } from "@/lib/storage";
import { logger } from "@/lib/logger";
import fs from "fs";

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

    if (!bookFileExists(book.filePath)) {
      return NextResponse.json({ error: "文件不存在" }, { status: 404 });
    }

    const filePath = getBookFilePath(book.filePath);
    const fileBuffer = fs.readFileSync(filePath);

    const contentTypeMap: Record<string, string> = {
      epub: "application/epub+zip",
      pdf: "application/pdf",
      txt: "text/plain; charset=utf-8",
      mobi: "application/x-mobipocket-ebook",
    };

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentTypeMap[book.format] || "application/octet-stream",
        "Content-Disposition": `inline; filename="${encodeURIComponent(book.title)}.${book.format}"`,
        "Content-Length": fileBuffer.length.toString(),
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    logger.error("book-file", "Failed to get book file", error);
    return NextResponse.json({ error: "获取文件失败" }, { status: 500 });
  }
}
