import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { books } from "@/lib/db/schema";
import { deleteBookFile, deleteCoverImage } from "@/lib/storage";
import { invalidateCoverCache } from "@/lib/cover-cache";
import { invalidateBookFacets } from "@/lib/book-facets-cache";
import { logger } from "@/lib/logger";
import { getAuthUserId, serverError, validateJson } from "@/lib/api-utils";
import { batchBookDeleteSchema } from "@/lib/validations";

export async function DELETE(req: NextRequest) {
  const authResult = await getAuthUserId();
  if (authResult.error) return authResult.error;
  const { userId } = authResult;

  try {
    const validation = await validateJson(req, batchBookDeleteSchema);
    if (validation.error) return validation.error;

    const uniqueBookIds = [...new Set(validation.data.bookIds)];

    // Fetch books to get their file paths for cleanup
    const booksToDelete = await db.query.books.findMany({
      where: and(
        eq(books.uploaderId, userId),
        inArray(books.id, uniqueBookIds)
      ),
    });

    if (booksToDelete.length === 0) {
      return NextResponse.json({ message: "没有找到可删除的书籍", deletedCount: 0 });
    }

    const actualBookIds = booksToDelete.map(b => b.id);

    // Delete from database
    await db.delete(books).where(
      and(
        eq(books.uploaderId, userId),
        inArray(books.id, actualBookIds)
      )
    );

    invalidateBookFacets(userId);

    // Background cleanup of files
    // We don't await this to speed up response, but we log errors
    void (async () => {
      for (const book of booksToDelete) {
        try {
          await deleteBookFile(book.filePath);
          if (book.cover) {
            await deleteCoverImage(book.cover);
            invalidateCoverCache(book.cover);
          }
        } catch (cleanupError) {
          logger.warn("books", `Batch delete: File cleanup failed for book ${book.id}`, cleanupError);
        }
      }
    })();

    return NextResponse.json({
      message: "删除成功",
      deletedCount: actualBookIds.length,
    });
  } catch (error) {
    logger.error("books", "Failed to batch delete books", error);
    return serverError("批量删除失败");
  }
}
