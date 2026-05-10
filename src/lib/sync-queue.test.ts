import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { SyncQueue, type SyncItem } from './sync-queue';
import { openDB } from 'idb';

vi.mock('idb', () => ({
  openDB: vi.fn(),
}));

describe('sync-queue', () => {
  let syncQueue: SyncQueue;
  let mockSyncFn: Mock;
  let mockDb: Record<string, unknown>;

  beforeEach(() => {
    mockDb = {
      objectStoreNames: { contains: vi.fn().mockReturnValue(true) },
      createObjectStore: vi.fn(),
      get: vi.fn().mockResolvedValue(null),
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    };
    (openDB as unknown as Mock).mockResolvedValue(mockDb);

    Object.defineProperty(window.navigator, "onLine", {
      value: false,
      configurable: true,
      writable: true,
    });

    mockSyncFn = vi.fn().mockResolvedValue(undefined);

    syncQueue = new SyncQueue({
      syncFn: mockSyncFn,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    if (syncQueue) syncQueue.destroy();
  });

  function createSyncItem(overrides: Partial<SyncItem> = {}): SyncItem {
    return {
      bookId: 'book-1',
      progress: 0.5,
      location: 'location-1',
      ...overrides,
    };
  }

  describe('enqueue', () => {
    it('should add item to queue', async () => {
      const item = createSyncItem();
      await syncQueue.enqueue(item);

      expect(syncQueue.getPendingCount()).toBe(1);
    });

    it('should merge items with same bookId', async () => {
      const item1 = createSyncItem({ progress: 0.3 });
      const item2 = createSyncItem({ progress: 0.5 });

      await syncQueue.enqueue(item1);
      await syncQueue.enqueue(item2);

      expect(syncQueue.getPendingCount()).toBe(1);
      const pending = syncQueue.getPendingItems();
      expect(pending[0].progress).toBe(0.5);
    });

    it('should not merge items with different bookIds', async () => {
      const item1 = createSyncItem({ bookId: 'book-1' });
      const item2 = createSyncItem({ bookId: 'book-2' });

      await syncQueue.enqueue(item1);
      await syncQueue.enqueue(item2);

      expect(syncQueue.getPendingCount()).toBe(2);
    });

    it('should limit queue size to MAX_QUEUE_SIZE', async () => {
      for (let i = 0; i < 150; i++) {
        await syncQueue.enqueue(createSyncItem({ bookId: `book-${i}` }));
      }

      expect(syncQueue.getPendingCount()).toBe(100);
    });

    it('should persist queue to IDB', async () => {
      const item = createSyncItem();
      await syncQueue.enqueue(item);

      // wait for next tick for async persist
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(mockDb.put).toHaveBeenCalledWith('queue', [item], 'items');
    });

    it('should allow enqueue without auto sync', async () => {
      Object.defineProperty(window.navigator, "onLine", {
        value: true,
        configurable: true,
      });

      const item = createSyncItem();
      await syncQueue.enqueue(item, { autoSync: false });

      expect(mockSyncFn).not.toHaveBeenCalled();
      expect(syncQueue.getPendingCount()).toBe(1);
    });
  });

  describe('sync', () => {
    it('should sync items successfully', async () => {
      const item = createSyncItem();
      await syncQueue.enqueue(item);

      Object.defineProperty(window.navigator, "onLine", {
        value: true,
        configurable: true,
      });

      await syncQueue.sync();

      expect(mockSyncFn).toHaveBeenCalledWith([item], undefined);
      expect(syncQueue.getPendingCount()).toBe(0);
    });

    it('should sync multiple items as a batch', async () => {
      const item1 = createSyncItem({ bookId: 'book-1' });
      const item2 = createSyncItem({ bookId: 'book-2' });
      const item3 = createSyncItem({ bookId: 'book-3' });

      await syncQueue.enqueue(item1);
      await syncQueue.enqueue(item2);
      await syncQueue.enqueue(item3);

      Object.defineProperty(window.navigator, "onLine", {
        value: true,
        configurable: true,
      });

      await syncQueue.sync();

      expect(mockSyncFn).toHaveBeenCalledTimes(1);
      expect(mockSyncFn).toHaveBeenCalledWith([item1, item2, item3], undefined);
      expect(syncQueue.getPendingCount()).toBe(0);
    });
    it('should keep failed items queued after max retries', async () => {
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
      expect(syncQueue.getPendingCount()).toBe(1);
    });

    it('should retry with exponential backoff', async () => {
      mockSyncFn
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValueOnce(undefined);

      const item = createSyncItem();
      await syncQueue.enqueue(item);

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

      expect(mockSyncFn).toHaveBeenCalledTimes(1);
      expect(mockSyncFn).toHaveBeenCalledWith([item1, item2], undefined);
    });

  });

  describe('clear', () => {
    it('should clear queue', async () => {
      await syncQueue.enqueue(createSyncItem());
      await syncQueue.enqueue(createSyncItem({ bookId: 'book-2' }));

      syncQueue.clear();

      expect(syncQueue.getPendingCount()).toBe(0);
    });

    it('should persist cleared queue', async () => {
      await syncQueue.enqueue(createSyncItem());
      syncQueue.clear();

      await new Promise(resolve => setTimeout(resolve, 0));
      expect(mockDb.put).toHaveBeenCalledWith('queue', [], 'items');
    });
  });

  describe('persistence', () => {
    it('should restore queue from IDB on construction', async () => {
      const items = [
        createSyncItem({ bookId: 'book-1' }),
        createSyncItem({ bookId: 'book-2' }),
      ];

      // Setup mock to return the stored value async
      (mockDb.get as Mock).mockResolvedValueOnce(items);

      const newQueue = new SyncQueue({
        syncFn: mockSyncFn,
      });

      // Allow async loadFromStorage to complete
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(newQueue.getPendingCount()).toBe(2);
    });
  });
});
