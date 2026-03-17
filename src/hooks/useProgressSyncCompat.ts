"use client";

import { useCallback, useRef, useEffect } from "react";
import { useProgressSync } from "./useProgressSync";
import { useReadingTracker } from "./useReadingTracker";

/**
 * 兼容旧系统的进度保存 Hook
 * 内部使用新的同步系统，但接口保持兼容
 */
export function useProgressSyncCompat(bookId: string) {
  const {
    updateProgress,
    forceSync,
    pendingSync,
    isSyncing,
  } = useProgressSync(bookId);

  const {
    accumulatedDuration,
    startTracking,
    pauseTracking,
  } = useReadingTracker(bookId);

  // Refs for compatibility with old code
  const currentLocationRef = useRef<string | null>(null);
  const progressRef = useRef(0);
  const currentPageRef = useRef<number | undefined>(undefined);
  const totalPagesRef = useRef<number | undefined>(undefined);

  // Start tracking on mount
  useEffect(() => {
    startTracking();
    return () => {
      pauseTracking();
    };
  }, [startTracking, pauseTracking]);

  // Force sync on unmount
  useEffect(() => {
    const handleBeforeUnload = () => {
      forceSync();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [forceSync]);

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
            currentPage: currentPageRef.current,
            totalPages: totalPagesRef.current,
            readingDuration: accumulatedDuration,
          },
          forceSave
        );

        return { conflict: false };
      } catch (error) {
        console.error("Failed to save progress:", error);
        return { conflict: false };
      }
    },
    [updateProgress, accumulatedDuration]
  );

  // Compatible debouncedSaveProgress function
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedSaveProgress = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      saveProgress();
    }, 500);
  }, [saveProgress]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  return {
    // Refs (保持兼容)
    currentLocationRef,
    progressRef,
    currentPageRef,
    totalPagesRef,

    // 函数 (保持兼容)
    saveProgress,
    debouncedSaveProgress,

    // 新增功能
    startTracking,
    pauseTracking,
    pendingSync,
    isSyncing,
    forceSync,
    accumulatedDuration,
  };
}
