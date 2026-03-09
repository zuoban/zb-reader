import { openDB, IDBPDatabase } from "idb";
import { SyncQueue, type SyncItem } from "./sync-queue";
import { getDeviceId } from "./device";
import { logger } from "./logger";

const DB_NAME = "zb-reader-progress";
const DB_VERSION = 1;
const PROGRESS_STORE = "progress";

export interface LocalProgress {
  bookId: string;
  version: number;
  progress: number;
  location: string;
  scrollRatio: number | null;
  currentPage: number | null;
  totalPages: number | null;
  readingDuration: number;
  deviceId: string;
  updatedAt: string;
  dirty: boolean;
  syncVersion: number;
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
      syncFn: async (item: SyncItem) => {
        const response = await fetch("/api/progress/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item),
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
    });
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
        throw new Error("Failed to load from server");
      }

      const data = await response.json();

      if (!data.progress) {
        return null;
      }

      const serverProgress: LocalProgress = {
        bookId,
        version: data.progress.version || 1,
        progress: data.progress.progress || 0,
        location: data.progress.location || "",
        scrollRatio: data.progress.scrollRatio || null,
        currentPage: data.progress.currentPage || null,
        totalPages: data.progress.totalPages || null,
        readingDuration: data.progress.readingDuration || 0,
        deviceId: data.progress.deviceId || "",
        updatedAt: data.progress.updatedAt || new Date().toISOString(),
        dirty: false,
        syncVersion: data.progress.version || 1,
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
          version: 0,
          progress: 0,
          location: "",
          scrollRatio: null,
          currentPage: null,
          totalPages: null,
          readingDuration: 0,
          deviceId: getDeviceId(),
          updatedAt: new Date().toISOString(),
          dirty: false,
          syncVersion: 0,
        };
      }

      const now = new Date().toISOString();
      const newVersion = current.version + 1;

      const updated: LocalProgress = {
        ...current,
        version: newVersion,
        progress: update.progress ?? current.progress,
        location: update.location ?? current.location,
        scrollRatio: update.scrollRatio ?? current.scrollRatio,
        currentPage: update.currentPage ?? current.currentPage,
        totalPages: update.totalPages ?? current.totalPages,
        readingDuration: update.readingDuration ?? current.readingDuration,
        deviceId: getDeviceId(),
        updatedAt: now,
        dirty: true,
        syncVersion: current.syncVersion,
      };

      await this.db.put(PROGRESS_STORE, updated);

      const syncItem: SyncItem = {
        bookId,
        clientVersion: updated.version,
        progress: updated.progress,
        location: updated.location,
        scrollRatio: updated.scrollRatio,
        readingDuration: updated.readingDuration,
        deviceId: updated.deviceId,
        clientTimestamp: now,
        currentPage: updated.currentPage,
        totalPages: updated.totalPages,
      };

      if (forceSync) {
        await this.syncQueue.enqueue(syncItem);
      } else {
        this.debouncedEnqueue(syncItem);
      }
    } catch (error) {
      logger.error("local-progress", "Failed to update progress", error);
    }
  }

  private debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

  private debouncedEnqueue(item: SyncItem): void {
    const existing = this.debounceTimers.get(item.bookId);
    if (existing) {
      clearTimeout(existing);
    }

    const timer = setTimeout(() => {
      this.debounceTimers.delete(item.bookId);
      this.syncQueue.enqueue(item);
    }, 500);

    this.debounceTimers.set(item.bookId, timer);
  }

  async forceSync(): Promise<void> {
    await this.syncQueue.sync();
  }

  getPendingSyncCount(): number {
    return this.syncQueue.getPendingCount();
  }

  isSyncing(): boolean {
    return (this.syncQueue as any).syncing || false;
  }

  onQueueChange(callback: (count: number) => void): () => void {
    const handler = (e: Event) => {
      if (e instanceof CustomEvent && e.type === "progress-queue-change") {
        callback((e as any).detail.pendingCount);
      }
    };

    window.addEventListener("progress-queue-change", handler);
    return () => {
      window.removeEventListener("progress-queue-change", handler);
    };
  }

  onSyncStateChange(callback: (syncing: boolean) => void): () => void {
    const handler = (e: Event) => {
      if (e instanceof CustomEvent && e.type === "progress-sync-state") {
        callback((e as any).detail.syncing);
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
