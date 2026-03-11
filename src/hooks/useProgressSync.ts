"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getLocalProgressManager } from "@/lib/local-progress";
import type { ProgressUpdate } from "@/lib/local-progress";
import type { ProgressHistory } from "@/lib/db/schema";

interface ProgressQueueEventDetail {
  pendingCount: number;
}

interface ProgressSyncStateEventDetail {
  syncing: boolean;
}

export interface UseProgressSyncReturn {
  localVersion: number;
  serverVersion: number;
  pendingSync: boolean;
  isSyncing: boolean;
  progress: number;
  readingDuration: number;
  updateProgress: (update: ProgressUpdate, forceSync?: boolean) => void;
  forceSync: () => Promise<void>;
  getHistory: () => Promise<ProgressHistory[]>;
  restoreTo: (historyId: string) => Promise<void>;
}

export function useProgressSync(bookId: string): UseProgressSyncReturn {
  const [localVersion, setLocalVersion] = useState(0);
  const [serverVersion, setServerVersion] = useState(0);
  const [pendingSync, setPendingSync] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [readingDuration, setReadingDuration] = useState(0);

  const managerRef = useRef(getLocalProgressManager());

  useEffect(() => {
    const manager = managerRef.current;

    const handleQueueChange = (e: Event) => {
      if (e instanceof CustomEvent) {
        const detail = e.detail as ProgressQueueEventDetail;
        setPendingSync(detail.pendingCount > 0);
      }
    };

    const handleSyncState = (e: Event) => {
      if (e instanceof CustomEvent) {
        const detail = e.detail as ProgressSyncStateEventDetail;
        setIsSyncing(detail.syncing);
      }
    };

    window.addEventListener("progress-queue-change", handleQueueChange);
    window.addEventListener("progress-sync-state", handleSyncState);

    manager.loadFromServer(bookId).then((localProgress) => {
      if (localProgress) {
        setLocalVersion(localProgress.version);
        setServerVersion(localProgress.syncVersion);
        setProgress(localProgress.progress);
        setReadingDuration(localProgress.readingDuration);
      }
    });

    return () => {
      window.removeEventListener("progress-queue-change", handleQueueChange);
      window.removeEventListener("progress-sync-state", handleSyncState);
    };
  }, [bookId]);

  const updateProgress = useCallback(
    async (update: ProgressUpdate, forceSync = false) => {
    const manager = managerRef.current;
    await manager.updateProgress(bookId, update, forceSync);

    if (update.progress !== undefined) {
      setProgress(update.progress);
    }
    if (update.readingDuration !== undefined) {
      setReadingDuration(update.readingDuration);
    }
  },
  [bookId]
  );

  const forceSync = useCallback(async () => {
    const manager = managerRef.current;
    await manager.forceSync();
  }, []);

  const getHistory = useCallback(async () => {
    try {
      const response = await fetch(`/api/progress/history?bookId=${bookId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch history");
      }
      const data = await response.json();
      return data.history || [];
    } catch (error) {
      console.error("Failed to get history:", error);
      return [];
    }
  }, [bookId]);

  const restoreTo = useCallback(
    async (historyId: string) => {
      try {
        const response = await fetch("/api/progress/restore", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ historyId }),
        });

        if (!response.ok) {
          throw new Error("Failed to restore");
        }

        const data = await response.json();

        setServerVersion(data.serverVersion);
        setProgress(data.progress.progress);
        setReadingDuration(data.progress.readingDuration);

        await managerRef.current.loadFromServer(bookId);
      } catch (error) {
        console.error("Failed to restore:", error);
        throw error;
      }
    },
    [bookId]
  );

  return {
    localVersion,
    serverVersion,
    pendingSync,
    isSyncing,
    progress,
    readingDuration,
    updateProgress,
    forceSync,
    getHistory,
    restoreTo,
  };
}
