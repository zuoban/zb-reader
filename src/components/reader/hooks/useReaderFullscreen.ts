import { useState, useEffect, useCallback } from "react";
import { logger } from "@/lib/logger";

/**
 * Manages fullscreen state for the reader, including orientation lock on mobile.
 *
 * Returns `{ isFullscreen, toggleFullscreen }` for controlling fullscreen mode.
 * Automatically listens for fullscreen changes (including user-initiated via browser UI).
 */
export function useReaderFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
        // Lock orientation to portrait on mobile devices
        const orientation = screen.orientation as ScreenOrientation & {
          lock?: (type: string) => Promise<void>;
        };
        if (orientation && typeof orientation.lock === "function") {
          try {
            await orientation.lock("portrait");
          } catch (err) {
            logger.debug("reader", "屏幕方向锁定失败", err);
          }
        }
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
        // Unlock orientation when exiting fullscreen
        const orientation = screen.orientation as ScreenOrientation & {
          unlock?: () => void;
        };
        if (orientation && typeof orientation.unlock === "function") {
          try {
            orientation.unlock();
          } catch (err) {
            logger.debug("reader", "屏幕方向解锁失败", err);
          }
        }
      }
    } catch (error) {
      logger.warn("reader", "全屏切换失败", error);
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = !!document.fullscreenElement;
      setIsFullscreen(isFs);

      // Unlock orientation when exiting fullscreen
      if (!isFs) {
        const orientation = screen.orientation as ScreenOrientation & {
          unlock?: () => void;
        };
        if (orientation && typeof orientation.unlock === "function") {
          try {
            orientation.unlock();
          } catch (err) {
            logger.debug("reader", "屏幕方向解锁失败", err);
          }
        }
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  return { isFullscreen, toggleFullscreen };
}
