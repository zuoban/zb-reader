"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getLocalProgressManager } from "@/lib/local-progress";
import { logger } from "@/lib/logger";
import type { ProgressUpdate } from "@/lib/local-progress";
import type { ProgressHistory } from "@/lib/db/schema";

interface ProgressQueueEventDetail {
  pendingCount: number;
}

export interface UseProgressSyncReturn {
  pendingSync: boolean;
  progress: number;
  updateProgress: (update: ProgressUpdate, forceSync?: boolean) => void;
  forceSync: () => Promise<void>;
  flushPendingDebounced: () => Promise<void>;
  getHistory: () => Promise<ProgressHistory[]>;
  restoreTo: (historyId: string) => Promise<void>;
}

export function useProgressSync(bookId: string): UseProgressSyncReturn {
  const [pendingSync, setPendingSync] = useState(false);
  const [progress, setProgress] = useState(0);

  const managerRef = useRef(getLocalProgressManager());

  useEffect(() => {
    const manager = managerRef.current;

    const handleQueueChange = (e: Event) => {
      if (e instanceof CustomEvent) {
        const detail = e.detail as ProgressQueueEventDetail;
        setPendingSync(detail.pendingCount > 0);
      }
    };

    window.addEventListener("progress-queue-change", handleQueueChange);

    manager.loadFromServer(bookId).then((localProgress) => {
      if (localProgress) {
        setProgress(localProgress.progress);
      }
    });

    return () => {
      window.removeEventListener("progress-queue-change", handleQueueChange);
    };
  }, [bookId]);

  const updateProgress = useCallback(
    async (update: ProgressUpdate, forceSync = false) => {
      const manager = managerRef.current;
      await manager.updateProgress(bookId, update, forceSync);

      if (update.progress !== undefined) {
        setProgress(update.progress);
      }
    },
    [bookId]
  );

  const forceSync = useCallback(async () => {
    const manager = managerRef.current;
    await manager.forceSync();
  }, []);

  const flushPendingDebounced = useCallback(async () => {
    const manager = managerRef.current;
    await manager.flushPendingDebounced(bookId);
  }, [bookId]);

  const getHistory = useCallback(async () => {
    try {
      const response = await fetch(`/api/progress/history?bookId=${bookId}`);
      if (!response.ok) {
        if (response.status === 401) return [];
        throw new Error(`Server returned ${response.status}`);
      }
      const data = await response.json();
      return data.history || [];
    } catch (error) {
      logger.error("reader", "Failed to get progress history", error);
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
          if (response.status === 401) throw new Error("请先登录");
          throw new Error(`Server returned ${response.status}`);
        }

        const data = await response.json();

        setProgress(data.progress.progress);

        await managerRef.current.loadFromServer(bookId);
      } catch (error) {
        logger.error("reader", "Failed to restore reading progress", error);
        throw error;
      }
    },
    [bookId]
  );

  return {
    pendingSync,
    progress,
    updateProgress,
    forceSync,
    flushPendingDebounced,
    getHistory,
    restoreTo,
  };
}
