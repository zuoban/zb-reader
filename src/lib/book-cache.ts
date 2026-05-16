import { logger } from "@/lib/logger";
const DB_NAME = "zb-reader-books";
const DB_VERSION = 6;
const STORE_NAME = "books";

// Cache limits
const MAX_CACHE_SIZE_MB = 500;
const MAX_CACHE_SIZE_BYTES = MAX_CACHE_SIZE_MB * 1024 * 1024;
const CACHE_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface CachedBook {
  id: string;
  file: ArrayBuffer;
  timestamp: number;
  size: number;
  meta?: {
    title: string;
    author: string;
    format: string;
    coverUrl?: string;
  };
}

let db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, {
          keyPath: "id",
        });
        store.createIndex("timestamp", "timestamp");
        store.createIndex("size", "size");
      } else {
        // Add size index for existing stores (migration from v4)
        const store = request.transaction!.objectStore(STORE_NAME);
        if (!store.indexNames.contains("size")) {
          store.createIndex("size", "size");
        }
      }
    };

    request.onblocked = () => {
      logger.warn(
        "book-cache",
        "Database upgrade blocked. Close other tabs and refresh."
      );
    };
  });
}

export function closeDB(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export async function cacheBook(
  bookId: string,
  fileData: ArrayBuffer,
  options?: { meta?: CachedBook["meta"] }
): Promise<void> {
  try {
    const database = await openDB();

    // Enforce size limit before adding
    await evictIfNeeded(database, fileData.byteLength);

    const transaction = database.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    const book: CachedBook = {
      id: bookId,
      file: fileData,
      timestamp: Date.now(),
      size: fileData.byteLength,
      meta: options?.meta,
    };

    await new Promise<void>((resolve, reject) => {
      const request = store.put(book);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    logger.error("book-cache", "Failed to cache book:", error);
    throw error;
  }
}

export async function getCachedBook(
  bookId: string
): Promise<ArrayBuffer | null> {
  try {
    const database = await openDB();
    const transaction = database.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.get(bookId);
      request.onsuccess = () => {
        const book = request.result as CachedBook | undefined;
        if (!book) {
          resolve(null);
          return;
        }
        // Check expiry
        if (Date.now() - book.timestamp > CACHE_EXPIRY_MS) {
          logger.info("book-cache", `Cache expired for book ${bookId}, removing`);
          store.delete(bookId);
          resolve(null);
          return;
        }
        resolve(book.file);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    logger.error("book-cache", "Failed to get cached book:", error);
    return null;
  }
}

export async function hasCachedBook(bookId: string): Promise<boolean> {
  try {
    const cached = await getCachedBook(bookId);
    return cached !== null;
  } catch {
    return false;
  }
}

export async function getCachedBookMeta(
  bookId: string
): Promise<CachedBook["meta"] | null> {
  try {
    const database = await openDB();
    const transaction = database.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.get(bookId);
      request.onsuccess = () => {
        const book = request.result as CachedBook | undefined;
        resolve(book?.meta ?? null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

/**
 * Evict cached books if total size would exceed MAX_CACHE_SIZE_BYTES.
 * Removes oldest books first until there's enough space.
 */
async function evictIfNeeded(database: IDBDatabase, newBookSize: number): Promise<void> {
  const store = database.transaction([STORE_NAME], "readonly").objectStore(STORE_NAME);

  const allBooks = await new Promise<CachedBook[]>((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result as CachedBook[]);
    request.onerror = () => reject(request.error);
  });

  const totalSize = allBooks.reduce((sum, b) => sum + b.size, 0);
  if (totalSize + newBookSize <= MAX_CACHE_SIZE_BYTES) return;

  // Sort by timestamp (oldest first) and evict until under limit
  const sorted = [...allBooks].sort((a, b) => a.timestamp - b.timestamp);
  let currentTotal = totalSize;

  for (const book of sorted) {
    if (currentTotal + newBookSize <= MAX_CACHE_SIZE_BYTES) break;
    currentTotal -= book.size;
    logger.info("book-cache", `Evicting book "${book.id}" (${(book.size / 1024 / 1024).toFixed(1)}MB) to free space`);
    await clearBookCache(book.id);
  }
}

export async function clearBookCache(bookId: string): Promise<void> {
  try {
    const database = await openDB();
    const transaction = database.transaction([STORE_NAME], "readwrite");
    const bookStore = transaction.objectStore(STORE_NAME);

    await new Promise<void>((resolve, reject) => {
      const request = bookStore.delete(bookId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    logger.error("book-cache", "Failed to clear book cache:", error);
  }
}

export async function getAllCachedBooks(): Promise<
  Array<{ id: string; size: number; timestamp: number }>
> {
  try {
    const database = await openDB();
    const transaction = database.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index("timestamp");

    return new Promise((resolve, reject) => {
      const request = index.getAll();
      request.onsuccess = () => {
        const books = request.result as CachedBook[];
        resolve(
          books.map((book) => ({
            id: book.id,
            size: book.size,
            timestamp: book.timestamp,
          }))
        );
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    logger.error("book-cache", "Failed to get all cached books:", error);
    return [];
  }
}

export async function clearAllCache(): Promise<void> {
  try {
    const database = await openDB();
    const transaction = database.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    await new Promise<void>((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    logger.error("book-cache", "Failed to clear all cache:", error);
    throw error;
  }
}
