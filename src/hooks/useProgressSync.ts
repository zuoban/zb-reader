"use client";

import { useEffect, useCallback, useRef } from "react";
import { getLocalProgressManager } from "@/lib/local-progress";
import type { ProgressUpdate, ServerProgressSnapshot } from "@/lib/local-progress";

export interface UseProgressSyncReturn {
  updateProgress: (update: ProgressUpdate, forceSync?: boolean) => void;
  forceSync: (options?: { keepalive?: boolean }) => Promise<void>;
}

export function useProgressSync(
  bookId: string,
  initialProgress?: ServerProgressSnapshot | null
): UseProgressSyncReturn {
  const managerRef = useRef(getLocalProgressManager());

  useEffect(() => {
    const manager = managerRef.current;

    if (initialProgress === undefined) {
      void manager.loadFromServer(bookId);
    } else if (initialProgress) {
      void manager.cacheServerProgress(bookId, initialProgress);
    }
  }, [bookId, initialProgress]);

  const updateProgress = useCallback(
    async (update: ProgressUpdate, forceSync = false) => {
      const manager = managerRef.current;
      await manager.updateProgress(bookId, update, forceSync);
    },
    [bookId]
  );

  const forceSync = useCallback(async (options?: { keepalive?: boolean }) => {
    const manager = managerRef.current;
    await manager.forceSync(bookId, options);
  }, [bookId]);

  return {
    updateProgress,
    forceSync,
  };
}
