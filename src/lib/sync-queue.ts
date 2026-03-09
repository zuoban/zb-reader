import { logger } from '@/lib/logger';

export interface SyncItem {
  bookId: string;
  clientVersion: number;
  progress: number;
  location: string;
  scrollRatio: number | null;
  readingDuration: number;
  deviceId: string;
  clientTimestamp: string;
  currentPage?: number | null;
  totalPages?: number | null;
}

const SYNC_QUEUE_KEY = 'zb_reader_sync_queue';
const MAX_QUEUE_SIZE = 100;
const MAX_RETRY_COUNT = 5;
const INITIAL_RETRY_DELAY = 1000;

export class SyncQueue {
  private queue: SyncItem[] = [];
  private syncing = false;
  private syncFn: (item: SyncItem) => Promise<void>;
  private onSyncComplete?: () => void;
  private onSyncError?: (error: Error) => void;
  private onQueueChange?: (pendingCount: number) => void;

  constructor(options: {
    syncFn: (item: SyncItem) => Promise<void>;
    onSyncComplete?: () => void;
    onSyncError?: (error: Error) => void;
    onQueueChange?: (pendingCount: number) => void;
  }) {
    this.syncFn = options.syncFn;
    this.onSyncComplete = options.onSyncComplete;
    this.onSyncError = options.onSyncError;
    this.onQueueChange = options.onQueueChange;

    if (typeof window !== 'undefined') {
      this.loadFromStorage();
      window.addEventListener('online', () => this.sync());
    }
  }

  async enqueue(item: SyncItem): Promise<void> {
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
    this.notifyQueueChange();

    if (navigator.onLine && !this.syncing) {
      this.sync();
    }
  }

  async sync(): Promise<void> {
    if (this.syncing || !navigator.onLine || this.queue.length === 0) {
      return;
    }

    this.syncing = true;

    while (this.queue.length > 0) {
      const item = this.queue[0];
      let retryCount = 0;
      let success = false;

      while (retryCount < MAX_RETRY_COUNT && !success) {
        try {
          await this.syncFn(item);
          success = true;
          this.queue.shift();
          await this.persistQueue();
          this.notifyQueueChange();
          this.onSyncComplete?.();
        } catch (error) {
          retryCount++;
          logger.warn('sync-queue', `Sync failed (attempt ${retryCount}/${MAX_RETRY_COUNT})`, {
            bookId: item.bookId,
            error,
          });

          if (retryCount >= MAX_RETRY_COUNT) {
            logger.error('sync-queue', 'Sync failed after max retries', {
              bookId: item.bookId,
            });
            this.onSyncError?.(error instanceof Error ? error : new Error(String(error)));
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
    this.notifyQueueChange();
  }

  private async persistQueue(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      logger.error('sync-queue', 'Failed to persist queue', error);
    }
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(SYNC_QUEUE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (error) {
      logger.error('sync-queue', 'Failed to load queue from storage', error);
      this.queue = [];
    }
  }

  private notifyQueueChange(): void {
    this.onQueueChange?.(this.queue.length);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

let syncQueueInstance: SyncQueue | null = null;

export function getSyncQueue(options?: {
  syncFn: (item: SyncItem) => Promise<void>;
  onSyncComplete?: () => void;
  onSyncError?: (error: Error) => void;
  onQueueChange?: (pendingCount: number) => void;
}): SyncQueue {
  if (!syncQueueInstance && options) {
    syncQueueInstance = new SyncQueue(options);
  }
  
  if (!syncQueueInstance) {
    throw new Error('SyncQueue not initialized. Call getSyncQueue with options first.');
  }
  
  return syncQueueInstance;
}
