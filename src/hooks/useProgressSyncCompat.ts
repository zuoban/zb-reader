"use client";

import { useCallback, useRef, useEffect, useMemo } from "react";
import { logger } from "@/lib/logger";
import { debounce } from "@/lib/utils";
import { useProgressSync } from "./useProgressSync";
import type { ServerProgressSnapshot } from "@/lib/local-progress";

/**
 * 兼容旧系统的进度保存 Hook
 * 内部使用新的同步系统，但接口保持兼容
 */
export function useProgressSyncCompat(
  bookId: string,
  initialProgress?: ServerProgressSnapshot | null,
  options?: {
    currentLocationRef?: React.RefObject<string | null>;
    progressRef?: React.RefObject<number>;
  }
) {
  const {
    updateProgress,
    forceSync,
  } = useProgressSync(bookId, initialProgress);

  // Refs for compatibility with old code
  const internalLocationRef = useRef<string | null>(null);
  const internalProgressRef = useRef(0);
  
  const currentLocationRef = options?.currentLocationRef || internalLocationRef;
  const progressRef = options?.progressRef || internalProgressRef;

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
    [currentLocationRef, progressRef, updateProgress]
  );

  // Compatible name; properly debounced to avoid excessive DB writes during rapid navigation
  const debouncedSaveProgress = useMemo(
    () => debounce(() => void saveProgress(), 500),
    [saveProgress]
  );

  // Cleanup debounced function
  useEffect(() => {
    return () => {
      debouncedSaveProgress.cancel();
    };
  }, [debouncedSaveProgress]);

  // Force sync on unmount
  useEffect(() => {
    const syncPending = () => {
      void (async () => {
        debouncedSaveProgress.cancel(); // Cancel any pending debounced save
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
