import { NextRequest, NextResponse } from "next/server";
import { findOwnedBook } from "@/lib/book-ownership";
import { coverExists } from "@/lib/storage";
import { getCachedCover } from "@/lib/cover-cache";
import { logger } from "@/lib/logger";
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

    const coverBuffer = await getCachedCover(book.cover);

    if (!coverBuffer) {
      return notFound("封面文件读取失败");
    }

    return new NextResponse(new Uint8Array(coverBuffer), {
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
