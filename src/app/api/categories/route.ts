import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { books } from "@/lib/db/schema";
import { logger } from "@/lib/logger";
import { getBookFacets, invalidateBookFacets } from "@/lib/book-facets-cache";
import { badRequest, serverError, getAuthUserId, validateJson } from "@/lib/api-utils";
import { categoryDeleteSchema, categoryRenameSchema } from "@/lib/validations";

/**
 * GET: 获取用户所有分类及对应书籍数量
 */
export async function GET(_req: NextRequest) {
  const authResult = await getAuthUserId();
  if (authResult.error) return authResult.error;
  const { userId } = authResult;

  try {
    const { categories } = await getBookFacets(userId);

    return NextResponse.json({ categories }, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    logger.error("categories", "Failed to get categories", error);
    return serverError("获取分类失败");
  }
}

/**
 * PATCH: 全局重命名分类
 */
export async function PATCH(req: NextRequest) {
  const authResult = await getAuthUserId();
  if (authResult.error) return authResult.error;
  const { userId } = authResult;

  try {
    const validation = await validateJson(req, categoryRenameSchema);
    if (validation.error) return validation.error;
    const { oldName, newName } = validation.data;

    // 更新该用户下所有属于 oldName 的书籍为 newName
    await db
      .update(books)
      .set({
        category: newName,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(books.uploaderId, userId),
          eq(books.category, oldName)
        )
      );
    invalidateBookFacets(userId);

    return NextResponse.json({ message: "重命名成功" });
  } catch (error) {
    logger.error("categories", "Failed to rename category", error);
    return serverError("重命名失败");
  }
}

/**
 * DELETE: 全局删除分类 (将该分类下的书籍设为未分类)
 */
export async function DELETE(req: NextRequest) {
  const authResult = await getAuthUserId();
  if (authResult.error) return authResult.error;
  const { userId } = authResult;

  const { searchParams } = new URL(req.url);
  const validation = categoryDeleteSchema.safeParse({
    name: searchParams.get("name") ?? "",
  });

  if (!validation.success) {
    return badRequest(validation.error.issues[0]?.message || "参数错误");
  }
  const { name } = validation.data;

  try {
    await db
      .update(books)
      .set({
        category: null,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(books.uploaderId, userId),
          eq(books.category, name)
        )
      );
    invalidateBookFacets(userId);

    return NextResponse.json({ message: "分类已删除" });
  } catch (error) {
    logger.error("categories", "Failed to delete category", error);
    return serverError("删除分类失败");
  }
}
