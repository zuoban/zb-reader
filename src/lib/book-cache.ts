import { logger } from "@/lib/logger";
const DB_NAME = "zb-reader-books";
const DB_VERSION = 4;
const STORE_NAME = "books";
const LOCATIONS_STORE_NAME = "locations";

interface CachedBook {
  id: string;
  file: ArrayBuffer;
  timestamp: number;
  size: number;
  locations?: ArrayBuffer;
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
      }
      if (!database.objectStoreNames.contains(LOCATIONS_STORE_NAME)) {
        database.createObjectStore(LOCATIONS_STORE_NAME);
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

export async function cacheBook(
  bookId: string,
  fileData: ArrayBuffer,
  options?: { locations?: ArrayBuffer; meta?: CachedBook["meta"] }
): Promise<void> {
  try {
    const database = await openDB();
    const transaction = database.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    const book: CachedBook = {
      id: bookId,
      file: fileData,
      timestamp: Date.now(),
      size: fileData.byteLength,
      locations: options?.locations,
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
        resolve(book ? book.file : null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    logger.error("book-cache", "Failed to get cached book:", error);
    return null;
  }
}

export async function cacheBookLocations(
  bookId: string,
  locationsData: ArrayBuffer
): Promise<void> {
  try {
    const database = await openDB();
    const transaction = database.transaction([STORE_NAME, LOCATIONS_STORE_NAME], "readwrite");
    const bookStore = transaction.objectStore(STORE_NAME);
    const locationsStore = transaction.objectStore(LOCATIONS_STORE_NAME);

    const existing = await new Promise<CachedBook | undefined>((resolve, reject) => {
      const request = bookStore.get(bookId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    if (existing) {
      existing.locations = locationsData;
      await new Promise<void>((resolve, reject) => {
        const request = bookStore.put(existing);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }

    await new Promise<void>((resolve, reject) => {
      const request = locationsStore.put(locationsData, bookId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    logger.error("book-cache", "Failed to cache locations:", error);
  }
}

export async function getCachedLocations(
  bookId: string
): Promise<ArrayBuffer | null> {
  try {
    const database = await openDB();
    const transaction = database.transaction([STORE_NAME, LOCATIONS_STORE_NAME], "readonly");
    const bookStore = transaction.objectStore(STORE_NAME);
    const locationsStore = transaction.objectStore(LOCATIONS_STORE_NAME);

    const standaloneLocations = await new Promise<ArrayBuffer | undefined>((resolve, reject) => {
      const request = locationsStore.get(bookId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    if (standaloneLocations) {
      return standaloneLocations;
    }

    return new Promise((resolve, reject) => {
      const request = bookStore.get(bookId);
      request.onsuccess = () => {
        const book = request.result as CachedBook | undefined;
        resolve(book?.locations ?? null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch {
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

export async function clearBookCache(bookId: string): Promise<void> {
  try {
    const database = await openDB();
    const transaction = database.transaction([STORE_NAME, LOCATIONS_STORE_NAME], "readwrite");
    const bookStore = transaction.objectStore(STORE_NAME);
    const locationsStore = transaction.objectStore(LOCATIONS_STORE_NAME);

    await new Promise<void>((resolve, reject) => {
      const request = bookStore.delete(bookId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const request = locationsStore.delete(bookId);
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
    const transaction = database.transaction([STORE_NAME, LOCATIONS_STORE_NAME], "readwrite");
    const bookStore = transaction.objectStore(STORE_NAME);
    const locationsStore = transaction.objectStore(LOCATIONS_STORE_NAME);

    await new Promise<void>((resolve, reject) => {
      const request = bookStore.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const request = locationsStore.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    logger.error("book-cache", "Failed to clear all cache:", error);
    throw error;
  }
}
