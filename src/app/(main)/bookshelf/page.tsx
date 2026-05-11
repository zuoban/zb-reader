import { redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { BookshelfClient } from "@/components/bookshelf/BookshelfClient";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { books, readerSettings, readingProgress } from "@/lib/db/schema";
import { getBookFacets } from "@/lib/book-facets-cache";
import type { BookshelfInitialData } from "@/components/bookshelf/BookshelfClient";

const BOOKSHELF_PAGE = 1;
const BOOKSHELF_LIMIT = 20;

export const dynamic = "force-dynamic";

async function getBookshelfInitialData(userId: string): Promise<BookshelfInitialData> {
  const offset = (BOOKSHELF_PAGE - 1) * BOOKSHELF_LIMIT;
  const whereClause = eq(books.uploaderId, userId);

  const [result, facets, settings] = await Promise.all([
    db
      .select({
        book: books,
        progress: readingProgress.furthestProgress,
        lastReadAt: readingProgress.lastReadAt,
      })
      .from(books)
      .leftJoin(
        readingProgress,
        and(
          eq(readingProgress.bookId, books.id),
          eq(readingProgress.userId, userId)
        )
      )
      .where(whereClause)
      .orderBy(desc(books.updatedAt))
      .limit(BOOKSHELF_LIMIT)
      .offset(offset),
    getBookFacets(userId),
    db.query.readerSettings.findFirst({
      columns: {
        theme: true,
      },
      where: eq(readerSettings.userId, userId),
    }),
  ]);

  const progressMap: Record<string, number> = {};
  const lastReadAtMap: Record<string, string> = {};
  result.forEach((row) => {
    if (row.progress !== null && row.progress !== undefined) {
      progressMap[row.book.id] = row.progress;
      lastReadAtMap[row.book.id] = row.lastReadAt ?? "";
    }
  });

  const total = facets.allTotal;

  return {
    books: result.map((row) => row.book),
    categories: facets.categories,
    progressMap,
    lastReadAtMap,
    theme: settings?.theme === "dark" ? "dark" : "light",
    total,
    allTotal: total,
    page: BOOKSHELF_PAGE,
    limit: BOOKSHELF_LIMIT,
  };
}

export default async function BookshelfPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const initialData = await getBookshelfInitialData(session.user.id);

  return <BookshelfClient initialData={initialData} />;
}
