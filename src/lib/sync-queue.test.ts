import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SyncQueue, getSyncQueue, type SyncItem } from './sync-queue';

describe('sync-queue', () => {
  let syncQueue: SyncQueue;
  let mockSyncFn: any;
  let mockOnSyncComplete: any;
  let mockOnSyncError: any;
  let mockOnQueueChange: any;

  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
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
    it('should add item to queue', () => {
      const item = createSyncItem();
      syncQueue.enqueue(item);

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

    it('should persist queue to localStorage', () => {
      const item = createSyncItem();
      syncQueue.enqueue(item);

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

      await syncQueue.sync();

      expect(mockSyncFn).toHaveBeenCalledTimes(3);
      expect(mockSyncFn).toHaveBeenNthCalledWith(1, item1);
      expect(mockSyncFn).toHaveBeenNthCalledWith(2, item2);
      expect(mockSyncFn).toHaveBeenNthCalledWith(3, item3);
    });

    it('should stop syncing on error after max retries', async () => {
      const error = new Error('Sync failed');
      mockSyncFn.mockRejectedValue(error);

      const item = createSyncItem();
      syncQueue.enqueue(item);

      await syncQueue.sync();

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

      const startTime = Date.now();
      await syncQueue.sync();
      const duration = Date.now() - startTime;

      expect(mockSyncFn).toHaveBeenCalledTimes(3);
      // Should have delays: 1s + 2s = 3s minimum
      expect(duration).toBeGreaterThanOrEqual(2500);
    });

    it('should not sync when already syncing', async () => {
      let resolveSync: (value?: unknown) => void = () => {};
      mockSyncFn.mockImplementation(() => new Promise(resolve => { resolveSync = resolve; }));

      const item1 = createSyncItem({ bookId: 'book-1' });
      const item2 = createSyncItem({ bookId: 'book-2' });

      syncQueue.enqueue(item1);
      syncQueue.enqueue(item2);

      const syncPromise1 = syncQueue.sync();
      const syncPromise2 = syncQueue.sync();

      resolveSync!();

      await Promise.all([syncPromise1, syncPromise2]);

      expect(mockSyncFn).toHaveBeenCalledTimes(2);
    });

    it('should call onQueueChange after each sync', async () => {
      const item1 = createSyncItem({ bookId: 'book-1' });
      const item2 = createSyncItem({ bookId: 'book-2' });

      syncQueue.enqueue(item1);
      syncQueue.enqueue(item2);

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

    it('should persist cleared queue', () => {
      syncQueue.enqueue(createSyncItem());
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

      const newQueue = new SyncQueue({
        syncFn: mockSyncFn,
      });

      expect(newQueue.getPendingCount()).toBe(2);
    });
  });
});
