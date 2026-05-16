import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { books } from "@/lib/db/schema";
import { invalidateBookFacets } from "@/lib/book-facets-cache";
import { logger } from "@/lib/logger";
import { getAuthUserId, notFound, serverError, validateJson } from "@/lib/api-utils";
import { batchBookCategorySchema } from "@/lib/validations";

export async function PATCH(req: NextRequest) {
  const authResult = await getAuthUserId();
  if (authResult.error) return authResult.error;
  const { userId } = authResult;

  try {
    const validation = await validateJson(req, batchBookCategorySchema);
    if (validation.error) return validation.error;

    const uniqueBookIds = [...new Set(validation.data.bookIds)];
    const category = validation.data.category?.trim() || null;
    const result = await db
      .update(books)
      .set({
        category,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(books.uploaderId, userId),
          inArray(books.id, uniqueBookIds)
        )
      );

    const updatedCount = Number(result?.changes ?? 0);
    if (updatedCount === 0) {
      return notFound("书籍不存在");
    }

    invalidateBookFacets(userId);

    return NextResponse.json({
      updatedCount,
      category,
    });
  } catch (error) {
    logger.error("books", "Failed to batch update book categories", error);
    return serverError("分类保存失败");
  }
}
