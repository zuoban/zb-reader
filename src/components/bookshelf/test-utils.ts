import type { Book } from "@/lib/db/schema";
import type { BookshelfInitialData } from "@/components/bookshelf/hooks/useBookshelfData";

export function createMockBook(overrides: Partial<Book> = {}): Book {
  const id = overrides.id ?? "book-1";

  return {
    id,
    title: `书籍 ${id}`,
    author: "作者",
    cover: null,
    filePath: `${id}.epub`,
    fileSize: 1024,
    format: "epub",
    description: null,
    isbn: null,
    publisher: null,
    publishDate: null,
    language: null,
    category: null,
    uploaderId: "user-1",
    createdAt: "2026-05-10T00:00:00.000Z",
    updatedAt: "2026-05-10T00:00:00.000Z",
    ...overrides,
  };
}

export function createBookshelfInitialData(
  overrides: Partial<BookshelfInitialData> = {}
): BookshelfInitialData {
  const books = overrides.books ?? [createMockBook()];

  return {
    books,
    categories: [{ name: "技术", count: 1 }],
    progressMap: { [books[0]?.id ?? "book-1"]: 0.2 },
    lastReadAtMap: { [books[0]?.id ?? "book-1"]: "2026-05-10T01:00:00.000Z" },
    theme: "light",
    total: books.length,
    allTotal: books.length,
    page: 1,
    limit: 20,
    ...overrides,
  };
}
