import { describe, it, expect } from 'vitest';
import { resolveConflict, type ClientProgress } from './conflict-resolver';
import type { ReadingProgress } from './db/schema';

function createServerProgress(overrides: Partial<ReadingProgress> = {}): ReadingProgress {
  return {
    id: 'server-1',
    userId: 'user-1',
    bookId: 'book-1',
    version: 10,
    progress: 0.5,
    location: 'location-server',
    scrollRatio: 0.5,
    currentPage: 100,
    totalPages: 200,
    readingDuration: 1800,
    deviceId: 'device-server',
    lastReadAt: '2024-01-15 10:00:00',
    createdAt: '2024-01-01 00:00:00',
    updatedAt: '2024-01-15 10:00:00',
    ...overrides,
  };
}

function createClientProgress(overrides: Partial<ClientProgress> = {}): ClientProgress {
  return {
    version: 10,
    progress: 0.5,
    location: 'location-client',
    scrollRatio: 0.5,
    readingDuration: 1800,
    deviceId: 'device-client',
    clientTimestamp: '2024-01-15T10:00:00Z',
    ...overrides,
  };
}

describe('conflict-resolver', () => {
  describe('resolveConflict', () => {
    it('should choose higher progress when difference > 10%', () => {
      const server = createServerProgress({ progress: 0.3 });
      const client = createClientProgress({ progress: 0.45 });
      
      const result = resolveConflict(server, client);
      
      expect(result.action).toBe('keep_client');
      expect(result.winner.progress).toBe(0.45);
      expect(result.reason).toBe('progress_difference_significant');
    });

    it('should choose server when server progress is higher', () => {
      const server = createServerProgress({ progress: 0.6 });
      const client = createClientProgress({ progress: 0.45 });
      
      const result = resolveConflict(server, client);
      
      expect(result.action).toBe('keep_server');
      expect(result.winner.progress).toBe(0.6);
      expect(result.reason).toBe('progress_difference_significant');
    });

    it('should not use progress rule when difference <= 10%', () => {
      const server = createServerProgress({ 
        progress: 0.5, 
        readingDuration: 1800,
        updatedAt: '2024-01-15 10:00:00'
      });
      const client = createClientProgress({ 
        progress: 0.55, 
        readingDuration: 2400,
        clientTimestamp: '2024-01-15T11:00:00Z'
      });
      
      const result = resolveConflict(server, client);
      
      // Should use reading duration rule, not progress
      expect(result.reason).toBe('reading_duration_longer');
      expect(result.action).toBe('keep_client');
    });

    it('should choose longer reading duration when difference > 5 minutes', () => {
      const server = createServerProgress({ 
        progress: 0.5, 
        readingDuration: 1800 // 30 minutes
      });
      const client = createClientProgress({ 
        progress: 0.5, 
        readingDuration: 2400 // 40 minutes
      });
      
      const result = resolveConflict(server, client);
      
      expect(result.action).toBe('keep_client');
      expect(result.winner.readingDuration).toBe(2400);
      expect(result.reason).toBe('reading_duration_longer');
    });

    it('should choose server when server has longer duration', () => {
      const server = createServerProgress({ 
        progress: 0.5, 
        readingDuration: 3600 // 60 minutes
      });
      const client = createClientProgress({ 
        progress: 0.5, 
        readingDuration: 1800 // 30 minutes
      });
      
      const result = resolveConflict(server, client);
      
      expect(result.action).toBe('keep_server');
      expect(result.winner.readingDuration).toBe(3600);
      expect(result.reason).toBe('reading_duration_longer');
    });

    it('should not use duration rule when difference <= 5 minutes', () => {
      const server = createServerProgress({ 
        progress: 0.5, 
        readingDuration: 1800,
        updatedAt: '2024-01-15 10:00:00'
      });
      const client = createClientProgress({ 
        progress: 0.5, 
        readingDuration: 2000, // 3.3 minutes more
        clientTimestamp: '2024-01-15T11:00:00Z'
      });
      
      const result = resolveConflict(server, client);
      
      // Should use timestamp rule, not duration
      expect(result.reason).toBe('timestamp_newer');
    });

    it('should choose newer timestamp when other rules do not apply', () => {
      const server = createServerProgress({ 
        progress: 0.5, 
        readingDuration: 1800,
        updatedAt: '2024-01-15 10:00:00'
      });
      const client = createClientProgress({ 
        progress: 0.5, 
        readingDuration: 1800,
        clientTimestamp: '2024-01-15T11:00:00Z'
      });
      
      const result = resolveConflict(server, client);
      
      expect(result.action).toBe('keep_client');
      expect(result.reason).toBe('timestamp_newer');
    });

    it('should choose server when timestamp is newer', () => {
      const server = createServerProgress({ 
        progress: 0.5, 
        readingDuration: 1800,
        updatedAt: '2024-01-15 11:00:00'
      });
      const client = createClientProgress({ 
        progress: 0.5, 
        readingDuration: 1800,
        clientTimestamp: '2024-01-15T09:00:00'
      });
      
      const result = resolveConflict(server, client);
      
      expect(result.action).toBe('keep_server');
      expect(result.reason).toBe('timestamp_newer');
    });

    it('should apply rules in priority order: progress > duration > timestamp', () => {
      // Progress rule should win
      const server1 = createServerProgress({ progress: 0.3, readingDuration: 3600 });
      const client1 = createClientProgress({ progress: 0.45, readingDuration: 1800 });
      const result1 = resolveConflict(server1, client1);
      expect(result1.reason).toBe('progress_difference_significant');

      // Duration rule should win (progress diff <= 10%)
      const server2 = createServerProgress({ 
        progress: 0.5, 
        readingDuration: 1800,
        updatedAt: '2024-01-15 12:00:00'
      });
      const client2 = createClientProgress({ 
        progress: 0.55, 
        readingDuration: 3600,
        clientTimestamp: '2024-01-15T11:00:00Z'
      });
      const result2 = resolveConflict(server2, client2);
      expect(result2.reason).toBe('reading_duration_longer');
      expect(result2.action).toBe('keep_client');

      // Timestamp rule should win (progress and duration diffs are small)
      const server3 = createServerProgress({ 
        progress: 0.5, 
        readingDuration: 1800,
        updatedAt: '2024-01-15 10:00:00'
      });
      const client3 = createClientProgress({ 
        progress: 0.55, 
        readingDuration: 2000,
        clientTimestamp: '2024-01-15T11:00:00Z'
      });
      const result3 = resolveConflict(server3, client3);
      expect(result3.reason).toBe('timestamp_newer');
    });

    it('should include loser in resolution for history', () => {
      const server = createServerProgress({ progress: 0.3 });
      const client = createClientProgress({ progress: 0.45 });
      
      const result = resolveConflict(server, client);
      
      expect(result.loser).toBeDefined();
      expect(result.loser.progress).toBe(0.3);
    });
  });
});
