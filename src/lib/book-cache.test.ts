import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  cacheBook,
  getCachedBook,
  hasCachedBook,
  clearBookCache,
  getAllCachedBooks,
  clearAllCache,
  closeDB,
} from "@/lib/book-cache";

const TEST_BOOK_ID = "test-book-123";
const TEST_FILE_DATA = new ArrayBuffer(1024);

describe("Book Cache (IndexedDB)", () => {
  beforeEach(async () => {
    try {
      await clearAllCache();
    } catch (error) {
      console.error("Failed to clear cache:", error);
    }
  });

  afterEach(async () => {
    try {
      closeDB();
    } catch (error) {
      console.error("Failed to close db:", error);
    }
  });

  it("caches a book file", async () => {
    await cacheBook(TEST_BOOK_ID, TEST_FILE_DATA);
    const exists = await hasCachedBook(TEST_BOOK_ID);
    expect(exists).toBe(true);
  });

  it("retrieves a cached book file", async () => {
    await cacheBook(TEST_BOOK_ID, TEST_FILE_DATA);
    const cached = await getCachedBook(TEST_BOOK_ID);
    expect(cached).not.toBeNull();
    expect(cached?.byteLength).toBe(TEST_FILE_DATA.byteLength);
  });

  it("returns null for non-existent book", async () => {
    const cached = await getCachedBook("non-existent-book");
    expect(cached).toBeNull();
  });

  it("clears a specific book cache", async () => {
    await cacheBook(TEST_BOOK_ID, TEST_FILE_DATA);
    await clearBookCache(TEST_BOOK_ID);
    const exists = await hasCachedBook(TEST_BOOK_ID);
    expect(exists).toBe(false);
  });

  it("lists all cached books", async () => {
    await cacheBook("book-1", new ArrayBuffer(100));
    await cacheBook("book-2", new ArrayBuffer(200));
    await cacheBook("book-3", new ArrayBuffer(300));

    const books = await getAllCachedBooks();
    expect(books).toHaveLength(3);
    expect(books.map((b) => b.id)).toContain("book-1");
    expect(books.map((b) => b.id)).toContain("book-2");
    expect(books.map((b) => b.id)).toContain("book-3");
    expect(books.find((b) => b.id === "book-1")?.size).toBe(100);
    expect(books.find((b) => b.id === "book-2")?.size).toBe(200);
    expect(books.find((b) => b.id === "book-3")?.size).toBe(300);
  });

  it("clears all cache", async () => {
    await cacheBook("book-1", new ArrayBuffer(100));
    await cacheBook("book-2", new ArrayBuffer(200));

    const booksBefore = await getAllCachedBooks();
    expect(booksBefore.length).toBeGreaterThan(0);

    await clearAllCache();

    const booksAfter = await getAllCachedBooks();
    expect(booksAfter).toHaveLength(0);
  });

  it("overwrites existing cache", async () => {
    const firstData = new ArrayBuffer(100);
    const secondData = new ArrayBuffer(200);

    await cacheBook(TEST_BOOK_ID, firstData);
    await cacheBook(TEST_BOOK_ID, secondData);

    const cached = await getCachedBook(TEST_BOOK_ID);
    expect(cached).not.toBeNull();
    expect(cached?.byteLength).toBe(200);
  });
});

describe("Book Cache Migration", () => {
  const DB_NAME = "zb-reader-books";
  const STORE_NAME = "books";

  beforeEach(async () => {
    closeDB();
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(DB_NAME);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });

  afterEach(() => {
    closeDB();
  });

  it("successfully migrates from version 4 to version 5", async () => {
    // 1. Create a version 4 database with the 'books' store but NO 'size' index
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 4);
      request.onupgradeneeded = () => {
        const db = request.result;
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("timestamp", "timestamp");
      };
      request.onsuccess = () => {
        request.result.close();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });

    // 2. Now call cacheBook (which uses version 5)
    // This should trigger onupgradeneeded and the migration logic
    const testData = new ArrayBuffer(100);
    await cacheBook("migration-test", testData);

    // 3. Verify the 'size' index exists and data can be retrieved
    const books = await getAllCachedBooks();
    expect(books).toHaveLength(1);
    expect(books[0].id).toBe("migration-test");
    expect(books[0].size).toBe(100);
  });
});
