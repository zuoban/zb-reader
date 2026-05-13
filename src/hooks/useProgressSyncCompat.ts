"use client";

import { useCallback, useRef, useEffect } from "react";
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

  // Stable references for handler logic to avoid react-hooks/refs warnings
  const stateRef = useRef({
    currentLocationRef,
    progressRef,
    updateProgress,
    forceSync
  });

  // Keep stateRef up to date after each render
  useEffect(() => {
    stateRef.current = {
      currentLocationRef,
      progressRef,
      updateProgress,
      forceSync
    };
  });

  // Compatible saveProgress function
  const saveProgress = useCallback(
    async (forceSave = false): Promise<{ conflict: boolean }> => {
      const { currentLocationRef: locRef, progressRef: progRef, updateProgress: update } = stateRef.current;
      const location = locRef.current;
      const progress = progRef.current;

      if (!location) {
        return { conflict: false };
      }

      try {
        await update(
          {
            progress,
            location,
          },
          forceSave
        );

        return { conflict: false };
      } catch (error) {
        logger.error("reader", "Failed to save progress", error);
        return { conflict: false };
      }
    },
    [] // Truly stable
  );

  // Create debounced save function using useCallback with stable reference
  // Using a ref pattern that avoids render-time access by wrapping in effect
  const debouncedSaveRef = useRef<ReturnType<typeof debounce> | null>(null);

  // Initialize the debounce function once using useEffect
  useEffect(() => {
    if (debouncedSaveRef.current == null) {
      debouncedSaveRef.current = debounce((force?: boolean) => {
        void saveProgress(force);
      }, 500);
    }
    return () => {
      debouncedSaveRef.current?.cancel();
    };
  }, [saveProgress]);

  // Wrapper function that uses the ref outside of render
  const debouncedSaveProgress = useCallback((force?: boolean) => {
    debouncedSaveRef.current?.(force);
  }, []);

  // Cleanup & Life cycle management
  useEffect(() => {
    const syncPending = () => {
      void (async () => {
        debouncedSaveRef.current?.cancel();
        await saveProgress(true);
        const { forceSync: sync } = stateRef.current;
        await sync({ keepalive: true });
      })();
    };

    const handleVisibilityChange = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        syncPending();
      }
    };

    const currentWindow = typeof window !== "undefined" ? window : null;
    const currentDocument = typeof document !== "undefined" ? document : null;

    currentWindow?.addEventListener("pagehide", syncPending);
    currentWindow?.addEventListener("beforeunload", syncPending);
    currentDocument?.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      debouncedSaveRef.current?.cancel();
      currentWindow?.removeEventListener("pagehide", syncPending);
      currentWindow?.removeEventListener("beforeunload", syncPending);
      currentDocument?.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [saveProgress]);

  return {
    currentLocationRef,
    progressRef,
    saveProgress,
    debouncedSaveProgress,
    forceSync,
  };
}
