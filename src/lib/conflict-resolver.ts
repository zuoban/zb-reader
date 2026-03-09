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

export function resolveConflict(
  server: ServerProgress,
  client: ClientProgress
): ConflictResolution {
  const progressDiff = Math.abs(server.progress - client.progress);
  
  // Rule 1: Progress difference > 10%, choose the larger one
  if (progressDiff > 0.1) {
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
  if (durationDiff > 300) {
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
  
  // Add 1 second tolerance
  if (clientTime > serverTime + 1000) {
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
