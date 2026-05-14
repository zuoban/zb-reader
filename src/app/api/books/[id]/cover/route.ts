import { NextRequest, NextResponse } from "next/server";
import { findOwnedBook } from "@/lib/book-ownership";
import { coverExists } from "@/lib/storage";
import { getCachedCover } from "@/lib/cover-cache";
import { logger } from "@/lib/logger";
import { notFound, serverError, getAuthUserId } from "@/lib/api-utils";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await getAuthUserId();
  if (authResult.error) return authResult.error;
  const { userId } = authResult;

  const { id } = await params;
  
  const searchParams = req.nextUrl.searchParams;
  const widthParam = searchParams.get('w');
  const width = widthParam ? parseInt(widthParam, 10) : undefined;
  
  // Auto-detect format support from Accept header
  const acceptHeader = req.headers.get('accept') || '';
  let format: 'jpeg' | 'webp' | 'avif' = 'jpeg';
  if (acceptHeader.includes('image/avif')) {
    format = 'avif';
  } else if (acceptHeader.includes('image/webp')) {
    format = 'webp';
  }

  try {
    const book = await findOwnedBook(id, userId);

    if (!book || !book.cover) {
      return notFound("封面不存在");
    }

    if (!coverExists(book.cover)) {
      return notFound("封面文件不存在");
    }

    const coverData = await getCachedCover(book.cover, width, format);

    if (!coverData) {
      return notFound("封面文件读取失败");
    }

    const { buffer: coverBuffer, contentType } = coverData;

    const etag = `"${book.id}-${book.updatedAt}-${coverBuffer.length}-${width || 'original'}-${format}"`;
    if (req.headers.get("if-none-match") === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          "Cache-Control": "public, max-age=31536000, immutable",
          ETag: etag,
        },
      });
    }

    return new NextResponse(new Uint8Array(coverBuffer), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        ETag: etag,
      },
    });
  } catch (error) {
    logger.error("book-cover", "Failed to get cover", error);
    return serverError("获取封面失败");
  }
}
