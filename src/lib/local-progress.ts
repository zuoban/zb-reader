import { openDB, IDBPDatabase } from "idb";
import { SyncQueue, type SyncItem } from "./sync-queue";
import { logger } from "./logger";

const DB_NAME = "zb-reader-progress";
const DB_VERSION = 1;
const PROGRESS_STORE = "progress";

export interface LocalProgress {
  bookId: string;
  progress: number;
  location: string;
}

export interface ProgressUpdate {
  progress?: number;
  location?: string;
}

export interface ServerProgressSnapshot {
  progress?: number | null;
  location?: string | null;
}

export class LocalProgressManager {
  private db: IDBPDatabase | null = null;
  private initPromise: Promise<void>;
  private syncQueue: SyncQueue;

  constructor() {
    this.initPromise = this.initDB();

    this.syncQueue = new SyncQueue({
      syncFn: async (items: SyncItem[], options?: { keepalive?: boolean }) => {
        if (items.length === 0) return;
        
        const isBatch = items.length > 1;
        const route = isBatch ? "/api/progress/batch-sync" : "/api/progress/sync";
        const body = isBatch ? items : items[0];

        const response = await fetch(route, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          keepalive: options?.keepalive,
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: "同步失败" }));
          throw new Error(error.error || "同步失败");
        }
      },
    });
  }

  private async initDB(): Promise<void> {
    if (typeof window === "undefined") return;

    this.db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(PROGRESS_STORE)) {
          db.createObjectStore(PROGRESS_STORE, { keyPath: "bookId" });
        }
      },
    });
  }

  private async getProgress(bookId: string): Promise<LocalProgress | null> {
    await this.initPromise;
    if (!this.db) return null;

    try {
      const progress = await this.db.get(PROGRESS_STORE, bookId);
      return progress || null;
    } catch (error) {
      logger.error("local-progress", "Failed to get progress", error);
      return null;
    }
  }

  async loadFromServer(bookId: string): Promise<LocalProgress | null> {
    try {
      const response = await fetch(`/api/progress?bookId=${bookId}`);
      if (!response.ok) {
        if (response.status === 401) {
          logger.debug("local-progress", "Skip loading progress: User not authenticated");
          return null;
        }
        if (response.status === 404) {
          logger.debug("local-progress", "No progress found on server for book:", bookId);
          return null;
        }
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();

      if (!data.progress) {
        return null;
      }

      return this.cacheServerProgress(bookId, data.progress);
    } catch (error) {
      logger.error("local-progress", "Failed to load from server", error);
      return null;
    }
  }

  async cacheServerProgress(
    bookId: string,
    progress: ServerProgressSnapshot
  ): Promise<LocalProgress> {
    const serverProgress: LocalProgress = {
      bookId,
      progress: progress.progress || 0,
      location: progress.location || "",
    };

    await this.initPromise;
    if (this.db) {
      await this.db.put(PROGRESS_STORE, serverProgress);
    }

    return serverProgress;
  }

  async updateProgress(
    bookId: string,
    update: ProgressUpdate,
    forceSync = false
  ): Promise<void> {
    await this.initPromise;
    if (!this.db) return;

    try {
      let current = await this.getProgress(bookId);

      if (!current) {
        current = {
          bookId,
          progress: 0,
          location: "",
        };
      }

      const updated: LocalProgress = {
        ...current,
        progress: update.progress ?? current.progress,
        location: update.location ?? current.location,
      };

      await this.db.put(PROGRESS_STORE, updated);

      const syncItem: SyncItem = {
        bookId,
        progress: updated.progress,
        location: updated.location,
        clientUpdatedAt: new Date().toISOString(),
      };

      const isSignificant =
        forceSync ||
        Math.abs(updated.progress - current.progress) >= 0.1 ||
        updated.location !== current.location;

      if (forceSync) {
        await this.syncQueue.enqueue(syncItem, { autoSync: false });
      } else if (isSignificant) {
        this.debouncedEnqueue(syncItem);
      }
    } catch (error) {
      logger.error("local-progress", "Failed to update progress", error);
    }
  }

  private debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private maxWaitTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private pendingDebouncedItems = new Map<string, SyncItem>();

  private debouncedEnqueue(item: SyncItem): void {
    const existing = this.debounceTimers.get(item.bookId);
    if (existing) {
      clearTimeout(existing);
      this.debounceTimers.delete(item.bookId);
    }
    this.pendingDebouncedItems.set(item.bookId, item);

    if (!this.maxWaitTimers.has(item.bookId)) {
      const maxTimer = setTimeout(() => {
        const pendingItem = this.pendingDebouncedItems.get(item.bookId);
        if (pendingItem) {
          const timer = this.debounceTimers.get(item.bookId);
          if (timer) clearTimeout(timer);
          this.debounceTimers.delete(item.bookId);
          this.maxWaitTimers.delete(item.bookId);
          this.pendingDebouncedItems.delete(item.bookId);
          this.syncQueue.enqueue(pendingItem);
        }
      }, 30000);
      this.maxWaitTimers.set(item.bookId, maxTimer);
    }

    const timer = setTimeout(() => {
      this.debounceTimers.delete(item.bookId);
      
      const maxTimer = this.maxWaitTimers.get(item.bookId);
      if (maxTimer) {
        clearTimeout(maxTimer);
        this.maxWaitTimers.delete(item.bookId);
      }
      
      this.pendingDebouncedItems.delete(item.bookId);
      this.syncQueue.enqueue(item);
    }, 500);

    this.debounceTimers.set(item.bookId, timer);
  }

  async forceSync(bookId?: string, options?: { keepalive?: boolean }): Promise<void> {
    await this.flushPendingDebounced(bookId);
    await this.syncQueue.sync(options);
  }

  private async flushPendingDebounced(bookId?: string): Promise<void> {
    const entries = Array.from(this.pendingDebouncedItems.entries()).filter(
      ([pendingBookId]) => !bookId || pendingBookId === bookId
    );

    for (const [pendingBookId, item] of entries) {
      const timer = this.debounceTimers.get(pendingBookId);
      if (timer) {
        clearTimeout(timer);
        this.debounceTimers.delete(pendingBookId);
      }
      const maxTimer = this.maxWaitTimers.get(pendingBookId);
      if (maxTimer) {
        clearTimeout(maxTimer);
        this.maxWaitTimers.delete(pendingBookId);
      }
      this.pendingDebouncedItems.delete(pendingBookId);
      await this.syncQueue.enqueue(item);
    }
  }

}

let managerInstance: LocalProgressManager | null = null;

export function getLocalProgressManager(): LocalProgressManager {
  if (!managerInstance) {
    managerInstance = new LocalProgressManager();
  }
  return managerInstance;
}
