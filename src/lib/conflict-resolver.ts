import type { ReadingProgress } from '@/lib/db/schema';

export interface ClientProgress {
  version: number;
  progress: number;
  location: string;
  scrollRatio: number | null;
  readingDuration: number;
  deviceId: string;
  clientTimestamp: string;
}

export interface ConflictResolution {
  action: 'keep_server' | 'keep_client';
  winner: ServerProgress | ClientProgress;
  loser: ServerProgress | ClientProgress;
  reason: string;
}

type ServerProgress = Pick<ReadingProgress,
  | 'version'
  | 'progress'
  | 'location'
  | 'scrollRatio'
  | 'readingDuration'
  | 'deviceId'
  | 'updatedAt'
>;

// Thresholds for conflict resolution
const PROGRESS_THRESHOLD = 0.1;       // 10% progress difference
const DURATION_THRESHOLD = 300;       // 5 minutes reading duration difference
const TIME_TOLERANCE_MS = 1000;       // 1 second timestamp tolerance

export function resolveConflict(
  server: ServerProgress,
  client: ClientProgress
): ConflictResolution {
  const progressDiff = Math.abs(server.progress - client.progress);

  // Rule 1: Progress difference > 10%, choose the larger one
  if (progressDiff > PROGRESS_THRESHOLD) {
    if (server.progress > client.progress) {
      return {
        action: 'keep_server',
        winner: server,
        loser: client,
        reason: 'progress_difference_significant',
      };
    } else {
      return {
        action: 'keep_client',
        winner: client,
        loser: server,
        reason: 'progress_difference_significant',
      };
    }
  }

  // Rule 2: Reading duration difference > 5 minutes, choose the longer one
  const durationDiff = Math.abs(
    (server.readingDuration || 0) - client.readingDuration
  );
  if (durationDiff > DURATION_THRESHOLD) {
    if ((server.readingDuration || 0) > client.readingDuration) {
      return {
        action: 'keep_server',
        winner: server,
        loser: client,
        reason: 'reading_duration_longer',
      };
    } else {
      return {
        action: 'keep_client',
        winner: client,
        loser: server,
        reason: 'reading_duration_longer',
      };
    }
  }

  // Rule 3: Newer timestamp wins
  const serverTime = new Date(server.updatedAt).getTime();
  const clientTime = new Date(client.clientTimestamp).getTime();

  // Handle invalid timestamps (NaN falls back to server)
  if (isNaN(clientTime)) {
    return {
      action: 'keep_server',
      winner: server,
      loser: client,
      reason: 'invalid_client_timestamp',
    };
  }
  if (isNaN(serverTime)) {
    return {
      action: 'keep_client',
      winner: client,
      loser: server,
      reason: 'invalid_server_timestamp',
    };
  }

  if (clientTime > serverTime + TIME_TOLERANCE_MS) {
    return {
      action: 'keep_client',
      winner: client,
      loser: server,
      reason: 'timestamp_newer',
    };
  } else {
    return {
      action: 'keep_server',
      winner: server,
      loser: client,
      reason: 'timestamp_newer',
    };
  }
}
