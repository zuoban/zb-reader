import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { books } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getCoverFilePath, coverExists } from "@/lib/storage";
import { logger } from "@/lib/logger";
import fs from "fs";
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

    if (!book || !book.cover) {
      return notFound("封面不存在");
    }

    if (!coverExists(book.cover)) {
      return notFound("封面文件不存在");
    }

    const coverPath = getCoverFilePath(book.cover);
    const coverBuffer = fs.readFileSync(coverPath);

    return new NextResponse(coverBuffer, {
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
