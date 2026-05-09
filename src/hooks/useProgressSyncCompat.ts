"use client";

import { useCallback, useRef, useEffect } from "react";
import { logger } from "@/lib/logger";
import { useProgressSync } from "./useProgressSync";
import type { ServerProgressSnapshot } from "@/lib/local-progress";

/**
 * 兼容旧系统的进度保存 Hook
 * 内部使用新的同步系统，但接口保持兼容
 */
export function useProgressSyncCompat(
  bookId: string,
  initialProgress?: ServerProgressSnapshot | null
) {
  const {
    updateProgress,
    forceSync,
  } = useProgressSync(bookId, initialProgress);

  // Refs for compatibility with old code
  const currentLocationRef = useRef<string | null>(null);
  const progressRef = useRef(0);

  // Compatible saveProgress function
  const saveProgress = useCallback(
    async (forceSave = false): Promise<{ conflict: boolean }> => {
      if (!currentLocationRef.current) {
        return { conflict: false };
      }

      try {
        await updateProgress(
          {
            progress: progressRef.current,
            location: currentLocationRef.current,
          },
          forceSave
        );

        return { conflict: false };
      } catch (error) {
        logger.error("reader", "Failed to save progress", error);
        return { conflict: false };
      }
    },
    [updateProgress]
  );

  // Compatible name; sync debouncing is handled by LocalProgressManager.
  const debouncedSaveProgress = useCallback(() => {
    void saveProgress();
  }, [saveProgress]);

  // Force sync on unmount
  useEffect(() => {
    const syncPending = () => {
      void (async () => {
        await saveProgress(true);
        await forceSync({ keepalive: true });
      })();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        syncPending();
      }
    };

    window.addEventListener("pagehide", syncPending);
    window.addEventListener("beforeunload", syncPending);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", syncPending);
      window.removeEventListener("beforeunload", syncPending);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [forceSync, saveProgress]);

  return {
    // Refs (保持兼容)
    currentLocationRef,
    progressRef,

    // 函数 (保持兼容)
    saveProgress,
    debouncedSaveProgress,

    forceSync,
  };
}
