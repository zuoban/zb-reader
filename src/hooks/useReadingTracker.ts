"use client";

import { useEffect, useRef, useState } from "react";
import { ReadingTracker } from "@/lib/reading-tracker";

export interface UseReadingTrackerReturn {
  accumulatedDuration: number;
  isTracking: boolean;
  startTracking: () => void;
  pauseTracking: () => void;
  resetTracking: () => void;
  setDuration: (duration: number) => void;
}

export function useReadingTracker(
  bookId: string,
  options?: {
    onUpdate?: (duration: number) => void;
  accumulateInterval?: number;
  }
): UseReadingTrackerReturn {
  const [accumulatedDuration, setAccumulatedDuration] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const trackerRef = useRef<ReadingTracker | null>(null);

  useEffect(() => {
    trackerRef.current = new ReadingTracker({
      onAccumulate: (duration) => {
        setAccumulatedDuration(duration);
        options?.onUpdate?.(duration);
      },
      accumulateInterval: options?.accumulateInterval,
    });

    return () => {
      trackerRef.current?.destroy();
    };
  }, [bookId, options?.accumulateInterval]);

  useEffect(() => {
    if (trackerRef.current) {
      if (isTracking) {
        trackerRef.current.resume();
      } else {
        trackerRef.current.pause();
      }
    }
  }, [isTracking]);

  const startTracking = () => {
    setIsTracking(true);
  };

  const pauseTracking = () => {
    setIsTracking(false);
  };

  const resetTracking = () => {
    trackerRef.current?.reset();
    setAccumulatedDuration(0);
  };

  const setDuration = (duration: number) => {
    trackerRef.current?.setAccumulated(duration);
    setAccumulatedDuration(duration);
  };

  return {
    accumulatedDuration,
    isTracking,
    startTracking,
    pauseTracking,
    resetTracking,
    setDuration,
  };
}
