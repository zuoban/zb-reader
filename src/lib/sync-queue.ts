import { logger } from '@/lib/logger';
import { openDB } from 'idb';

export interface SyncItem {
  bookId: string;
  progress: number;
  location: string;
  clientUpdatedAt: string;
}

interface BackgroundSyncRegistration extends ServiceWorkerRegistration {
  sync?: {
    register: (tag: string) => Promise<void>;
  };
}

const DB_NAME = 'zb-reader-sync-queue';
const DB_VERSION = 2; // Incremented for syncing state
const STORE_NAME = 'queue';
const QUEUE_KEY = 'items';
const SYNCING_KEY = 'syncing';

const MAX_QUEUE_SIZE = 100;
const MAX_RETRY_COUNT = 5;
const INITIAL_RETRY_DELAY = 1000;

export class SyncQueue {
  private queue: SyncItem[] = [];
  private syncing = false;
  private syncFn: (items: SyncItem[], options?: { keepalive?: boolean }) => Promise<void>;
  private onlineHandler: () => void;
  private initPromise: Promise<void> | null = null;
  public static readonly SYNC_TAG = "sync-progress";

  constructor(options: {
    syncFn: (items: SyncItem[], options?: { keepalive?: boolean }) => Promise<void>;
  }) {
    this.syncFn = options.syncFn;
    this.onlineHandler = () => void this.sync();

    if (typeof window !== "undefined") {
      this.initPromise = this.loadFromStorage();
      window.addEventListener("online", this.onlineHandler);
    }
  }

  /** Ensure the queue is loaded from storage before any operations */
  private async ensureInitialized(): Promise<void> {
    if (this.initPromise) {
      await this.initPromise;
    }
  }

  /** Clean up event listeners and timers. Call on component unmount. */
  destroy(): void {
    if (typeof window !== "undefined") {
      window.removeEventListener("online", this.onlineHandler);
    }
    this.queue = [];
  }

  async enqueue(item: SyncItem, options?: { autoSync?: boolean }): Promise<void> {
    await this.ensureInitialized();
    const existingIndex = this.queue.findIndex((i) => i.bookId === item.bookId);

    if (existingIndex !== -1) {
      this.queue[existingIndex] = item;
    } else {
      if (this.queue.length >= MAX_QUEUE_SIZE) {
        this.queue.shift();
      }
      this.queue.push(item);
    }

    await this.persistQueue();

    if (options?.autoSync !== false) {
      const isDev = process.env.NODE_ENV === "development";
      const hasSW = typeof window !== "undefined" && "serviceWorker" in navigator;
      const hasSync = hasSW && "SyncManager" in window;

      // In development or if SW/Sync is not available, use regular sync immediately
      if (isDev || !hasSync) {
        if (navigator.onLine && !this.syncing) {
          void this.sync();
        }
        return;
      }

      try {
        // Use a timeout for serviceWorker.ready to avoid hanging indefinitely
        // if the service worker registration is failing or unregistering.
        const registration = await Promise.race([
          navigator.serviceWorker.ready,
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Timeout waiting for ServiceWorker registration")), 1000)
          ),
        ]) as BackgroundSyncRegistration;

        if (registration.sync) {
          await registration.sync.register(SyncQueue.SYNC_TAG);
        } else {
          throw new Error("SyncManager not available on registration");
        }
      } catch {
        // Fallback to regular sync
        if (navigator.onLine && !this.syncing) {
          void this.sync();
        }
      }
    }
  }

  async sync(options?: { keepalive?: boolean }): Promise<void> {
    await this.ensureInitialized();
    if (this.syncing || this.queue.length === 0) {
      return;
    }

    if (!navigator.onLine && !options?.keepalive) {
      logger.debug("sync-queue", "Skip sync: Navigator is offline");
      return;
    }

    this.syncing = true;
    await this.persistSyncingState(true);

    while (this.queue.length > 0) {
      const batch = [...this.queue];
      let success = false;
      let isClientError = false;

      // 如果是 keepalive 模式（页面卸载时），不进行重试，只尝试发送一次
      const maxAttempts = options?.keepalive ? 1 : MAX_RETRY_COUNT;

      for (let attempt = 1; attempt <= maxAttempts && !success; attempt++) {
        try {
          await this.syncFn(batch, options);
          success = true;
          this.queue = this.queue.filter((i) => !batch.includes(i));
          await this.persistQueue();
        } catch (error) {
          if (!options?.keepalive) {
            logger.warn("sync-queue", `Sync failed (attempt ${attempt}/${MAX_RETRY_COUNT})`, {
              error,
            });
          }

          if (attempt >= maxAttempts) {
            if (!options?.keepalive) {
              logger.error("sync-queue", "Sync failed after max retries", {
                attempts: attempt,
                queueSize: this.queue.length,
                firstItem: this.queue[0] ?? null,
                error,
              });
            }

            // 卸载时不移除队列，留给下次加载
            if (options?.keepalive) {
              break;
            }

            // 对于 4xx 客户端错误（如 401/400），直接移除失败项目
            // 对于 404（书籍不存在），保留队列以便书籍上传后重试
            // 对于 5xx 服务器错误，保留队列以便下次重试
            const status = error instanceof Error && 'status' in error 
              ? (error as { status: number }).status 
              : undefined;
            isClientError = status === 401 || status === 400;
            if (isClientError) {
              // 移除失败项目，避免阻塞队列
              this.queue = this.queue.filter((i) => !batch.includes(i));
              await this.persistQueue();
            }

            break;
          }

          const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
          await this.sleep(delay);
        }
      }

      // 只有在客户端错误或 keepalive 模式下才继续处理下一个批次
      // 服务器错误时保留队列中的剩余项目，等待下次同步
      if (!success && !isClientError) {
        break;
      }
    }

    this.syncing = false;
    await this.persistSyncingState(false);
  }

  getPendingCount(): number {
    return this.queue.length;
  }

  getPendingItems(): SyncItem[] {
    return [...this.queue];
  }

  clear(): void {
    this.queue = [];
    void this.persistQueue();
  }

  private async persistQueue(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const db = await openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        },
      });
      await db.put(STORE_NAME, this.queue, QUEUE_KEY);
    } catch {
      logger.error('sync-queue', 'Failed to persist queue to IDB');
    }  }

  private async persistSyncingState(state: boolean): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const db = await openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        },
      });
      await db.put(STORE_NAME, state, SYNCING_KEY);
    } catch {
    logger.error('sync-queue', 'Failed to persist syncing state to IDB');
    }  }

  private async loadFromStorage(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const db = await openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        },
      });

      // Load syncing state
      const wasSyncing = await db.get(STORE_NAME, SYNCING_KEY);
      if (wasSyncing) {
        // Last sync was interrupted; reset and retry on next load
        logger.info('sync-queue', 'Previous sync was interrupted, will retry');
        await db.put(STORE_NAME, false, SYNCING_KEY);
      }

      // Load queue
      const stored = await db.get(STORE_NAME, QUEUE_KEY);
      if (stored && Array.isArray(stored)) {
        this.queue = stored;
        if (navigator.onLine) {
          void this.sync();
        }
      }
    } catch (error) {
      logger.error('sync-queue', 'Failed to load queue from IDB', error);
      this.queue = [];
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
