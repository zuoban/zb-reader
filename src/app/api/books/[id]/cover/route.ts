import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { books } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getCoverFilePath, coverExists } from "@/lib/storage";
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

    if (!book || !book.cover) {
      return NextResponse.json({ error: "封面不存在" }, { status: 404 });
    }

    if (!coverExists(book.cover)) {
      return NextResponse.json({ error: "封面文件不存在" }, { status: 404 });
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
    return NextResponse.json({ error: "获取封面失败" }, { status: 500 });
  }
}
