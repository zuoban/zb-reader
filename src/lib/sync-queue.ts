import { logger } from '@/lib/logger';
import { openDB } from 'idb';

export interface SyncItem {
  bookId: string;
  progress: number;
  location: string;
  clientUpdatedAt: string;
}

const DB_NAME = 'zb-reader-sync-queue';
const DB_VERSION = 1;
const STORE_NAME = 'queue';
const QUEUE_KEY = 'items';

const MAX_QUEUE_SIZE = 100;
const MAX_RETRY_COUNT = 5;
const INITIAL_RETRY_DELAY = 1000;

export class SyncQueue {
  private queue: SyncItem[] = [];
  private syncing = false;
  private syncFn: (items: SyncItem[], options?: { keepalive?: boolean }) => Promise<void>;
  private onlineHandler: () => void;

  constructor(options: {
    syncFn: (items: SyncItem[], options?: { keepalive?: boolean }) => Promise<void>;
  }) {
    this.syncFn = options.syncFn;
    this.onlineHandler = () => this.sync();

    if (typeof window !== 'undefined') {
      this.loadFromStorage();
      window.addEventListener('online', this.onlineHandler);
    }
  }

  /** Clean up event listeners and timers. Call on component unmount. */
  destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.onlineHandler);
    }
    this.queue = [];
  }

  async enqueue(item: SyncItem, options?: { autoSync?: boolean }): Promise<void> {
    const existingIndex = this.queue.findIndex(i => i.bookId === item.bookId);
    
    if (existingIndex !== -1) {
      this.queue[existingIndex] = item;
    } else {
      if (this.queue.length >= MAX_QUEUE_SIZE) {
        this.queue.shift();
      }
      this.queue.push(item);
    }

    await this.persistQueue();

    if (options?.autoSync !== false && navigator.onLine && !this.syncing) {
      void this.sync();
    }
  }

  async sync(options?: { keepalive?: boolean }): Promise<void> {
    if (this.syncing || !navigator.onLine || this.queue.length === 0) {
      return;
    }

    this.syncing = true;

    while (this.queue.length > 0) {
      const batch = [...this.queue];
      let retryCount = 0;
      let success = false;

      // 如果是 keepalive 模式（页面卸载时），不进行重试，只尝试发送一次
      const maxAttempts = options?.keepalive ? 1 : MAX_RETRY_COUNT;

      while (retryCount < maxAttempts && !success) {
        try {
          await this.syncFn(batch, options);
          success = true;
          this.queue = this.queue.filter(i => !batch.includes(i));
          await this.persistQueue();
        } catch (error) {
          retryCount++;
          
          if (!options?.keepalive) {
            logger.warn('sync-queue', `Sync failed (attempt ${retryCount}/${MAX_RETRY_COUNT})`, {
              error,
            });
          }

          if (retryCount >= maxAttempts) {
            if (!options?.keepalive) {
              logger.error('sync-queue', 'Sync failed after max retries');
            }
            
            // 卸载时不移除队列，留给下次加载
            if (options?.keepalive) {
              break; 
            }

            break;
          }

          const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount - 1);
          await this.sleep(delay);
        }
      }

      if (!success) {
        break;
      }
    }

    this.syncing = false;
  }

  getPendingCount(): number {
    return this.queue.length;
  }

  getPendingItems(): SyncItem[] {
    return [...this.queue];
  }

  clear(): void {
    this.queue = [];
    this.persistQueue();
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
    } catch (error) {
      logger.error('sync-queue', 'Failed to persist queue to IDB', error);
    }
  }

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
      const stored = await db.get(STORE_NAME, QUEUE_KEY);
      if (stored && Array.isArray(stored)) {
        this.queue = stored;
        if (navigator.onLine) {
          this.sync();
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
