import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { SyncQueue, type SyncItem } from './sync-queue';

describe('sync-queue', () => {
  let syncQueue: SyncQueue;
  let mockSyncFn: Mock;
  let mockOnSyncComplete: Mock;
  let mockOnSyncError: Mock;
  let mockOnQueueChange: Mock<(n: number) => void>;

  beforeEach(() => {
    const storage = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => storage.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        storage.set(key, String(value));
      }),
      removeItem: vi.fn((key: string) => {
        storage.delete(key);
      }),
      clear: vi.fn(() => {
        storage.clear();
      }),
    });

    Object.defineProperty(window.navigator, "onLine", {
      value: false,
      configurable: true,
    });

    mockSyncFn = vi.fn().mockResolvedValue(undefined);
    mockOnSyncComplete = vi.fn();
    mockOnSyncError = vi.fn();
    mockOnQueueChange = vi.fn();

    syncQueue = new SyncQueue({
      syncFn: mockSyncFn,
      onSyncComplete: mockOnSyncComplete,
      onSyncError: mockOnSyncError,
      onQueueChange: mockOnQueueChange,
    });

    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  function createSyncItem(overrides: Partial<SyncItem> = {}): SyncItem {
    return {
      bookId: 'book-1',
      clientVersion: 1,
      progress: 0.5,
      location: 'location-1',
      scrollRatio: 0.5,
      readingDuration: 1000,
      deviceId: 'device-1',
      clientTimestamp: new Date().toISOString(),
      ...overrides,
    };
  }

  describe('enqueue', () => {
    it('should add item to queue', async () => {
      const item = createSyncItem();
      await syncQueue.enqueue(item);

      expect(syncQueue.getPendingCount()).toBe(1);
      expect(mockOnQueueChange).toHaveBeenCalledWith(1);
    });

    it('should merge items with same bookId', () => {
      const item1 = createSyncItem({ progress: 0.3 });
      const item2 = createSyncItem({ progress: 0.5 });

      syncQueue.enqueue(item1);
      syncQueue.enqueue(item2);

      expect(syncQueue.getPendingCount()).toBe(1);
      const pending = syncQueue.getPendingItems();
      expect(pending[0].progress).toBe(0.5);
    });

    it('should not merge items with different bookIds', () => {
      const item1 = createSyncItem({ bookId: 'book-1' });
      const item2 = createSyncItem({ bookId: 'book-2' });

      syncQueue.enqueue(item1);
      syncQueue.enqueue(item2);

      expect(syncQueue.getPendingCount()).toBe(2);
    });

    it('should limit queue size to MAX_QUEUE_SIZE', () => {
      for (let i = 0; i < 150; i++) {
        syncQueue.enqueue(createSyncItem({ bookId: `book-${i}` }));
      }

      expect(syncQueue.getPendingCount()).toBe(100);
    });

    it('should persist queue to localStorage', async () => {
      const item = createSyncItem();
      await syncQueue.enqueue(item);

      const stored = localStorage.getItem('zb_reader_sync_queue');
      expect(stored).toBeDefined();
      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].bookId).toBe('book-1');
    });
  });

  describe('sync', () => {
    it('should sync items successfully', async () => {
      const item = createSyncItem();
      syncQueue.enqueue(item);

      Object.defineProperty(window.navigator, "onLine", {
        value: true,
        configurable: true,
      });

      await syncQueue.sync();

      expect(mockSyncFn).toHaveBeenCalledWith(item);
      expect(mockOnSyncComplete).toHaveBeenCalled();
      expect(syncQueue.getPendingCount()).toBe(0);
    });

    it('should sync multiple items in order', async () => {
      const item1 = createSyncItem({ bookId: 'book-1' });
      const item2 = createSyncItem({ bookId: 'book-2' });
      const item3 = createSyncItem({ bookId: 'book-3' });

      syncQueue.enqueue(item1);
      syncQueue.enqueue(item2);
      syncQueue.enqueue(item3);

      Object.defineProperty(window.navigator, "onLine", {
        value: true,
        configurable: true,
      });

      await syncQueue.sync();

      expect(mockSyncFn).toHaveBeenCalledTimes(3);
      expect(mockSyncFn).toHaveBeenNthCalledWith(1, item1);
      expect(mockSyncFn).toHaveBeenNthCalledWith(2, item2);
      expect(mockSyncFn).toHaveBeenNthCalledWith(3, item3);
    });

    it('should stop syncing on error after max retries', async () => {
      vi.useFakeTimers();
      const error = new Error('Sync failed');
      mockSyncFn.mockRejectedValue(error);

      const item = createSyncItem();
      await syncQueue.enqueue(item);

      Object.defineProperty(window.navigator, "onLine", {
        value: true,
        configurable: true,
      });

      const syncPromise = syncQueue.sync();
      await vi.runAllTimersAsync();
      await syncPromise;
      vi.useRealTimers();

      expect(mockSyncFn).toHaveBeenCalledTimes(5);
      expect(mockOnSyncError).toHaveBeenCalledWith(error);
      expect(syncQueue.getPendingCount()).toBe(0);
    });

    it('should retry with exponential backoff', async () => {
      mockSyncFn
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValueOnce(undefined);

      const item = createSyncItem();
      syncQueue.enqueue(item);

      Object.defineProperty(window.navigator, "onLine", {
        value: true,
        configurable: true,
      });

      const startTime = Date.now();
      await syncQueue.sync();
      const duration = Date.now() - startTime;

      expect(mockSyncFn).toHaveBeenCalledTimes(3);
      // Should have delays: 1s + 2s = 3s minimum
      expect(duration).toBeGreaterThanOrEqual(2500);
    });

    it('should not sync when already syncing', async () => {
      let resolveFirst: (value?: unknown) => void = () => {};
      let callCount = 0;
      const firstPromise = new Promise(resolve => { resolveFirst = resolve; });
      mockSyncFn.mockImplementation(() => {
        callCount += 1;
        return callCount === 1 ? firstPromise : Promise.resolve();
      });

      const item1 = createSyncItem({ bookId: 'book-1' });
      const item2 = createSyncItem({ bookId: 'book-2' });

      await syncQueue.enqueue(item1);
      await syncQueue.enqueue(item2);

      Object.defineProperty(window.navigator, "onLine", {
        value: true,
        configurable: true,
      });

      const syncPromise1 = syncQueue.sync();
      const syncPromise2 = syncQueue.sync();

      resolveFirst();

      await Promise.all([syncPromise1, syncPromise2]);

      expect(mockSyncFn).toHaveBeenCalledTimes(2);
    });

    it('should call onQueueChange after each sync', async () => {
      const item1 = createSyncItem({ bookId: 'book-1' });
      const item2 = createSyncItem({ bookId: 'book-2' });

      syncQueue.enqueue(item1);
      syncQueue.enqueue(item2);

      Object.defineProperty(window.navigator, "onLine", {
        value: true,
        configurable: true,
      });

      await syncQueue.sync();

      expect(mockOnQueueChange).toHaveBeenCalled();
      const lastCall = mockOnQueueChange.mock.calls[mockOnQueueChange.mock.calls.length - 1];
      expect(lastCall[0]).toBe(0);
    });
  });

  describe('clear', () => {
    it('should clear queue', () => {
      syncQueue.enqueue(createSyncItem());
      syncQueue.enqueue(createSyncItem({ bookId: 'book-2' }));

      syncQueue.clear();

      expect(syncQueue.getPendingCount()).toBe(0);
    });

    it('should persist cleared queue', async () => {
      await syncQueue.enqueue(createSyncItem());
      syncQueue.clear();

      const stored = localStorage.getItem('zb_reader_sync_queue');
      expect(JSON.parse(stored!)).toEqual([]);
    });
  });

  describe('persistence', () => {
    it('should restore queue from localStorage on construction', () => {
      const items = [
        createSyncItem({ bookId: 'book-1' }),
        createSyncItem({ bookId: 'book-2' }),
      ];
      localStorage.setItem('zb_reader_sync_queue', JSON.stringify(items));

      // Setup mock to return the stored value
      vi.mocked(localStorage.getItem).mockImplementation((key: string) => {
        if (key === 'zb_reader_sync_queue') {
          return JSON.stringify(items);
        }
        return null;
      });

      const newQueue = new SyncQueue({
        syncFn: mockSyncFn,
      });

      expect(newQueue.getPendingCount()).toBe(2);
    });
  });
});
