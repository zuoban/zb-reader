import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { books } from "@/lib/db/schema";

export async function findOwnedBook(bookId: string, userId: string) {
  return db.query.books.findFirst({
    where: and(eq(books.id, bookId), eq(books.uploaderId, userId)),
  });
}
