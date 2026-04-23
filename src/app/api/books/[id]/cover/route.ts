import { NextRequest, NextResponse } from "next/server";
import { findOwnedBook } from "@/lib/book-ownership";
import { getCoverFilePath, coverExists } from "@/lib/storage";
import { logger } from "@/lib/logger";
import fs from "fs";
import { Readable } from "stream";
import { notFound, serverError, getAuthUserId } from "@/lib/api-utils";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await getAuthUserId();
  if (authResult.error) return authResult.error;
  const { userId } = authResult;

  const { id } = await params;

  try {
    const book = await findOwnedBook(id, userId);

    if (!book || !book.cover) {
      return notFound("封面不存在");
    }

    if (!coverExists(book.cover)) {
      return notFound("封面文件不存在");
    }

    const coverPath = getCoverFilePath(book.cover);
    const coverStream = fs.createReadStream(coverPath);

    return new NextResponse(Readable.toWeb(coverStream) as ReadableStream, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    logger.error("book-cover", "Failed to get cover", error);
    return serverError("获取封面失败");
  }
}
