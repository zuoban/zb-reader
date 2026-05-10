import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { readingProgress } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { badRequest, serverError, getAuthUserId } from "@/lib/api-utils";
import { progressBookIdSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const authResult = await getAuthUserId();
  if (authResult.error) return authResult.error;
  const { userId } = authResult;

  const { searchParams } = new URL(req.url);
  const parsed = progressBookIdSchema.safeParse({
    bookId: searchParams.get("bookId") ?? "",
  });

  if (!parsed.success) {
    return badRequest(
      searchParams.has("bookId")
        ? parsed.error.issues[0]?.message || "参数错误"
        : "缺少 bookId 参数"
    );
  }
  const { bookId } = parsed.data;

  try {
    const progress = await db.query.readingProgress.findFirst({
      where: and(
        eq(readingProgress.userId, userId),
        eq(readingProgress.bookId, bookId)
      ),
    });

    return NextResponse.json({
      progress: progress
        ? {
            progress: progress.progress,
            location: progress.location,
          }
        : null,
    });
  } catch (error) {
    logger.error("api", "Get progress error:", error);
    return serverError("获取进度失败");
  }
}
