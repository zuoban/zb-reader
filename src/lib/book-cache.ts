const DB_NAME = "zb-reader-books";
const DB_VERSION = 1;
const STORE_NAME = "books";

interface CachedBook {
  id: string;
  file: ArrayBuffer;
  timestamp: number;
  size: number;
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
    };
  });
}

export async function cacheBook(
  bookId: string,
  fileData: ArrayBuffer
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
    };

    await new Promise<void>((resolve, reject) => {
      const request = store.put(book);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Failed to cache book:", error);
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
    console.error("Failed to get cached book:", error);
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

export async function clearBookCache(bookId: string): Promise<void> {
  try {
    const database = await openDB();
    const transaction = database.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    await new Promise<void>((resolve, reject) => {
      const request = store.delete(bookId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Failed to clear book cache:", error);
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
    console.error("Failed to get all cached books:", error);
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
    console.error("Failed to clear all cache:", error);
    throw error;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}
