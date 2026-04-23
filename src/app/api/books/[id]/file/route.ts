import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { books } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getBookFilePath, bookFileExists } from "@/lib/storage";
import { logger } from "@/lib/logger";
import fs from "fs";
import { Readable } from "stream";
import { notFound, serverError, getAuthUserId } from "@/lib/api-utils";

export function buildBookDownloadName(title: string, format: string): string {
  const safeTitle = title
    .trim()
    .replaceAll(/["\\]/g, "_")
    .replace(/\s+/g, " ");
  const fallbackTitle = safeTitle || "book";
  return `${fallbackTitle}.${format}`;
}

export function buildBookDownloadAsciiName(title: string, format: string): string {
  const safeTitle = title
    .trim()
    .replaceAll(/["\\]/g, "_")
    .replace(/\s+/g, " ")
    .replace(/[^\x20-\x7E]/g, "")
    .trim();
  const fallbackTitle = safeTitle || "book";
  return `${fallbackTitle}.${format}`;
}

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

    if (!bookFileExists(book.filePath)) {
      return notFound("文件不存在");
    }

    const filePath = getBookFilePath(book.filePath);
    let fileStat: fs.Stats;
    let fileStream: fs.ReadStream;

    try {
      fileStat = fs.statSync(filePath);
      fileStream = fs.createReadStream(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return notFound("文件不存在");
      }
      throw error;
    }

    const contentTypeMap: Record<string, string> = {
      epub: "application/epub+zip",
    };
    const downloadName = buildBookDownloadName(book.title, book.format);
    const asciiDownloadName = buildBookDownloadAsciiName(book.title, book.format);

    return new NextResponse(Readable.toWeb(fileStream) as ReadableStream, {
      headers: {
        "Content-Type": contentTypeMap[book.format] || "application/octet-stream",
        "Content-Disposition": `inline; filename="${asciiDownloadName}"; filename*=UTF-8''${encodeURIComponent(downloadName)}`,
        "Content-Length": fileStat.size.toString(),
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    logger.error("book-file", "Failed to get book file", error);
    return serverError("获取文件失败");
  }
}
