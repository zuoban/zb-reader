import { useState, useEffect, useRef, useCallback } from "react";

const IDLE_TIMEOUT_MS = 3 * 60 * 1000;
const IDLE_WARNING_MS = 60 * 1000;

/**
 * Manages an idle timeout that shows a countdown warning before triggering a callback.
 *
 * After IDLE_TIMEOUT_MS - IDLE_WARNING_MS (2 minutes), shows a 60-second countdown.
 * When the full timeout elapses (3 minutes), calls `onTimeout`.
 *
 * @param onTimeout - Callback to invoke when idle timeout expires
 * @param isActive - When false, pauses the idle timer
 */
export function useIdleTimeout(
  onTimeout: () => void,
  isActive: boolean = true
) {
  const [idleCountdown, setIdleCountdown] = useState<number | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleWarningRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    if (idleWarningRef.current) {
      clearTimeout(idleWarningRef.current);
      idleWarningRef.current = null;
    }
    setIdleCountdown(null);

    if (!isActive) return;

    // Warning: 1 minute before timeout
    idleWarningRef.current = setTimeout(() => {
      setIdleCountdown(60);
    }, IDLE_TIMEOUT_MS - IDLE_WARNING_MS);

    // Timeout: trigger the callback
    idleTimerRef.current = setTimeout(() => {
      onTimeout();
    }, IDLE_TIMEOUT_MS);
  }, [onTimeout, isActive]);

  // Countdown tick
  useEffect(() => {
    if (idleCountdown === null || idleCountdown <= 0) return;

    const interval = setInterval(() => {
      setIdleCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [idleCountdown]);

  // Start timer when active changes
  useEffect(() => {
    if (isActive) {
      resetIdleTimer();
    } else {
      // Clear timers when inactive
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
      if (idleWarningRef.current) {
        clearTimeout(idleWarningRef.current);
        idleWarningRef.current = null;
      }
      setIdleCountdown(null);
    }

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (idleWarningRef.current) clearTimeout(idleWarningRef.current);
    };
  }, [isActive, resetIdleTimer]);

  return { idleCountdown, resetIdleTimer };
}
