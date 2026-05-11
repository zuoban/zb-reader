import { and, count, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { books } from "@/lib/db/schema";

export interface BookCategoryFacet {
  name: string;
  count: number;
}

interface BookFacetsCacheEntry {
  allTotal: number;
  categories: BookCategoryFacet[];
  timestamp: number;
}

const facetsCache = new Map<string, BookFacetsCacheEntry>();
const FACETS_CACHE_TTL_MS = 1000 * 30;
const MAX_FACETS_CACHE_SIZE = 500;

export async function getBookFacets(userId: string): Promise<{
  allTotal: number;
  categories: BookCategoryFacet[];
}> {
  const cached = facetsCache.get(userId);
  if (cached && Date.now() - cached.timestamp <= FACETS_CACHE_TTL_MS) {
    facetsCache.delete(userId);
    facetsCache.set(userId, cached);
    return {
      allTotal: cached.allTotal,
      categories: cached.categories,
    };
  }

  if (cached) {
    facetsCache.delete(userId);
  }

  const [allTotalResult, categoryRows] = await Promise.all([
    db.select({ count: count() }).from(books).where(eq(books.uploaderId, userId)),
    db
      .select({
        name: books.category,
        count: count(),
      })
      .from(books)
      .where(
        and(
          eq(books.uploaderId, userId),
          sql`coalesce(${books.category}, '') <> ''`
        )
      )
      .groupBy(books.category)
      .orderBy(books.category),
  ]);

  const entry: BookFacetsCacheEntry = {
    allTotal: allTotalResult[0]?.count ?? 0,
    categories: categoryRows.map((row) => ({
      name: row.name ?? "",
      count: row.count,
    })),
    timestamp: Date.now(),
  };

  facetsCache.set(userId, entry);
  while (facetsCache.size > MAX_FACETS_CACHE_SIZE) {
    const oldestKey = facetsCache.keys().next().value;
    if (!oldestKey) break;
    facetsCache.delete(oldestKey);
  }

  return {
    allTotal: entry.allTotal,
    categories: entry.categories,
  };
}

export function invalidateBookFacets(userId: string): void {
  facetsCache.delete(userId);
}
