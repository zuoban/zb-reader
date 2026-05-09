import { openDB, IDBPDatabase } from "idb";
import { SyncQueue, type SyncItem } from "./sync-queue";
import { getDeviceId } from "./device";
import { logger } from "./logger";

const DB_NAME = "zb-reader-progress";
const DB_VERSION = 1;
const PROGRESS_STORE = "progress";

interface ProgressQueueEventDetail {
  pendingCount: number;
}

interface ProgressSyncStateEventDetail {
  syncing: boolean;
}

export interface LocalProgress {
  bookId: string;
  progress: number;
  furthestProgress: number;
  location: string;
  scrollRatio: number | null;
  currentPage: number | null;
  totalPages: number | null;
  readingDuration: number;
  deviceId: string;
  updatedAt: string;
  dirty: boolean;
  lastSyncReadingDuration: number;
}

export interface ProgressUpdate {
  progress?: number;
  location?: string;
  scrollRatio?: number | null;
  currentPage?: number | null;
  totalPages?: number | null;
  readingDuration?: number;
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
      onQueueChange: (pendingCount) => {
        window.dispatchEvent(
          new CustomEvent("progress-queue-change", {
            detail: { pendingCount },
          })
        );
      },
      onSyncComplete: async () => {
        // 同步成功后，更新所有书籍的 lastSyncReadingDuration
        await this.updateLastSyncReadingDuration();
      },
    });

    if (typeof window !== "undefined") {
      const handleUnload = () => {
        this.flushPendingDebounced().then(() => {
          this.syncQueue.sync({ keepalive: true });
        });
      };

      window.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
          handleUnload();
        }
      });
      window.addEventListener("pagehide", handleUnload);
    }
  }

  private async updateLastSyncReadingDuration(): Promise<void> {
    if (!this.db) return;

    try {
      const allProgress = await this.db.getAll(PROGRESS_STORE);
      for (const progress of allProgress) {
        await this.db.put(PROGRESS_STORE, {
          ...progress,
          lastSyncReadingDuration: progress.readingDuration,
        });
      }
    } catch (error) {
      logger.error("local-progress", "Failed to update lastSyncReadingDuration", error);
    }
  }

  private async initDB(): Promise<void> {
    if (typeof window === "undefined") return;

    this.db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(PROGRESS_STORE)) {
          const store = db.createObjectStore(PROGRESS_STORE, { keyPath: "bookId" });
          store.createIndex("updatedAt", "updatedAt");
        }
      },
    });
  }

  async getProgress(bookId: string): Promise<LocalProgress | null> {
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

      const serverProgress: LocalProgress = {
        bookId,
        progress: data.progress.progress || 0,
        furthestProgress: data.progress.furthestProgress ?? data.progress.progress ?? 0,
        location: data.progress.location || "",
        scrollRatio: data.progress.scrollRatio || null,
        currentPage: data.progress.currentPage || null,
        totalPages: data.progress.totalPages || null,
        readingDuration: data.progress.readingDuration || 0,
        deviceId: data.progress.deviceId || "",
        updatedAt: data.progress.updatedAt || new Date().toISOString(),
        dirty: false,
        lastSyncReadingDuration: data.progress.readingDuration || 0,
      };

      await this.initPromise;
      if (this.db) {
        await this.db.put(PROGRESS_STORE, serverProgress);
      }

      return serverProgress;
    } catch (error) {
      logger.error("local-progress", "Failed to load from server", error);
      return null;
    }
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
          furthestProgress: 0,
          location: "",
          scrollRatio: null,
          currentPage: null,
          totalPages: null,
          readingDuration: 0,
          deviceId: getDeviceId(),
          updatedAt: new Date().toISOString(),
          dirty: false,
          lastSyncReadingDuration: 0,
        };
      }

      const now = new Date().toISOString();

      const updated: LocalProgress = {
        ...current,
        progress: update.progress ?? current.progress,
        furthestProgress: Math.max(current.furthestProgress ?? current.progress, update.progress ?? current.progress),
        location: update.location ?? current.location,
        scrollRatio: update.scrollRatio ?? current.scrollRatio,
        currentPage: update.currentPage ?? current.currentPage,
        totalPages: update.totalPages ?? current.totalPages,
        readingDuration: update.readingDuration ?? current.readingDuration,
        deviceId: getDeviceId(),
        updatedAt: now,
        dirty: true,
      };

      await this.db.put(PROGRESS_STORE, updated);

      // 计算阅读时长增量（本次同步周期内增加的时长）
      const readingDurationDelta = Math.max(
        0,
        (update.readingDuration ?? current.readingDuration) - current.lastSyncReadingDuration
      );

      const syncItem: SyncItem = {
        syncId: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
        bookId,
        progress: updated.progress,
        location: updated.location,
        scrollRatio: updated.scrollRatio,
        readingDuration: readingDurationDelta,
        deviceId: updated.deviceId,
        clientTimestamp: now,
        currentPage: updated.currentPage,
        totalPages: updated.totalPages,
      };

      const isSignificant =
        forceSync ||
        Math.abs(updated.progress - current.progress) >= 0.1 ||
        updated.location !== current.location ||
        updated.currentPage !== current.currentPage ||
        (updated.scrollRatio !== null && current.scrollRatio !== null && Math.abs(updated.scrollRatio - current.scrollRatio) >= 0.01) ||
        readingDurationDelta >= 60;

      if (forceSync) {
        await this.syncQueue.enqueue(syncItem);
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

  async forceSync(): Promise<void> {
    await this.flushPendingDebounced();
    await this.syncQueue.sync();
  }

  async flushPendingDebounced(bookId?: string): Promise<void> {
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

  getPendingSyncCount(): number {
    return this.syncQueue.getPendingCount();
  }

  isSyncing(): boolean {
    return this.syncQueue.isSyncing();
  }

  onQueueChange(callback: (count: number) => void): () => void {
    const handler = (e: Event) => {
      if (e instanceof CustomEvent) {
        const detail = e.detail as ProgressQueueEventDetail;
        if (detail?.pendingCount !== undefined) {
          callback(detail.pendingCount);
        }
      }
    };

    window.addEventListener("progress-queue-change", handler);
    return () => {
      window.removeEventListener("progress-queue-change", handler);
    };
  }

  onSyncStateChange(callback: (syncing: boolean) => void): () => void {
    const handler = (e: Event) => {
      if (e instanceof CustomEvent) {
        const detail = e.detail as ProgressSyncStateEventDetail;
        if (detail?.syncing !== undefined) {
          callback(detail.syncing);
        }
      }
    };

    window.addEventListener("progress-sync-state", handler);
    return () => {
      window.removeEventListener("progress-sync-state", handler);
    };
  }

  async clear(bookId: string): Promise<void> {
    await this.initPromise;
    if (!this.db) return;

    try {
      await this.db.delete(PROGRESS_STORE, bookId);
    } catch (error) {
      logger.error("local-progress", "Failed to clear progress", error);
    }
  }

  async getAllProgress(): Promise<LocalProgress[]> {
    await this.initPromise;
    if (!this.db) return [];

    try {
      return await this.db.getAll(PROGRESS_STORE);
    } catch (error) {
      logger.error("local-progress", "Failed to get all progress", error);
      return [];
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
