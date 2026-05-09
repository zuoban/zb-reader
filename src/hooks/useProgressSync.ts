"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getLocalProgressManager } from "@/lib/local-progress";
import type { ProgressUpdate, ServerProgressSnapshot } from "@/lib/local-progress";

interface ProgressQueueEventDetail {
  pendingCount: number;
}

export interface UseProgressSyncReturn {
  pendingSync: boolean;
  progress: number;
  updateProgress: (update: ProgressUpdate, forceSync?: boolean) => void;
  forceSync: (options?: { keepalive?: boolean }) => Promise<void>;
}

export function useProgressSync(
  bookId: string,
  initialProgress?: ServerProgressSnapshot | null
): UseProgressSyncReturn {
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

    if (initialProgress === undefined) {
      manager.loadFromServer(bookId).then((localProgress) => {
        if (localProgress) {
          setProgress(localProgress.progress);
        }
      });
    } else if (initialProgress) {
      manager.cacheServerProgress(bookId, initialProgress).then((localProgress) => {
        setProgress(localProgress.progress);
      });
    }

    return () => {
      window.removeEventListener("progress-queue-change", handleQueueChange);
    };
  }, [bookId, initialProgress]);

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

  const forceSync = useCallback(async (options?: { keepalive?: boolean }) => {
    const manager = managerRef.current;
    await manager.forceSync(bookId, options);
  }, [bookId]);

  return {
    pendingSync,
    progress,
    updateProgress,
    forceSync,
  };
}
