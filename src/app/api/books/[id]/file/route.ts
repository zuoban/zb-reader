import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { books } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getBookFilePath, bookFileExists } from "@/lib/storage";
import { logger } from "@/lib/logger";
import fs from "fs";
import { Readable } from "stream";
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

    if (!bookFileExists(book.filePath)) {
      return notFound("文件不存在");
    }

    const filePath = getBookFilePath(book.filePath);
    const fileStat = fs.statSync(filePath);
    const fileStream = fs.createReadStream(filePath);

    const contentTypeMap: Record<string, string> = {
      epub: "application/epub+zip",
    };

    return new NextResponse(Readable.toWeb(fileStream) as ReadableStream, {
      headers: {
        "Content-Type": contentTypeMap[book.format] || "application/octet-stream",
        "Content-Disposition": `inline; filename="${encodeURIComponent(book.title)}.${book.format}"`,
        "Content-Length": fileStat.size.toString(),
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    logger.error("book-file", "Failed to get book file", error);
    return serverError("获取文件失败");
  }
}
