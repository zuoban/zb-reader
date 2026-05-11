"use client";

import { useCallback, useRef } from "react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

interface UseReaderTtsAudioParams {
  bookTitle?: string | null;
  bookAuthor?: string | null;
  setIsPaused: (value: boolean) => void;
  setIsSpeaking: (value: boolean) => void;
  setIsTtsViewOpen: (value: boolean) => void;
  ttsSessionRef: React.MutableRefObject<number>;
}

interface PlayAudioOptions {
  onEnd?: () => void;
  onCleanup?: () => void;
  debugMeta?: { engine: "microsoft"; sentenceIndex?: number; paragraph?: string };
}

const IS_DEV = process.env.NODE_ENV !== "production";

export function useReaderTtsAudio({
  bookTitle,
  bookAuthor,
  setIsPaused,
  setIsSpeaking,
  setIsTtsViewOpen,
  ttsSessionRef,
}: UseReaderTtsAudioParams) {
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const ttsProgressRafRef = useRef<number | null>(null);
  const ttsResumeRef = useRef<(() => void) | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const mediaSessionSetupRef = useRef(false);

  const setupMediaSession = useCallback(() => {
    if (!("mediaSession" in navigator)) return;
    if (mediaSessionSetupRef.current) return;

    mediaSessionSetupRef.current = true;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: bookTitle || "朗读中",
      artist: bookAuthor || "ZB Reader",
      album: "电子书朗读",
    });

    navigator.mediaSession.playbackState = "playing";
  }, [bookAuthor, bookTitle]);

  const requestWakeLock = useCallback(async () => {
    if (!("wakeLock" in navigator)) return;

    try {
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
      }
      wakeLockRef.current = await navigator.wakeLock.request("screen");
    } catch {
      // ignore
    }
  }, []);

  const stopCurrentAudio = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
    }
    if (ttsProgressRafRef.current !== null) {
      cancelAnimationFrame(ttsProgressRafRef.current);
      ttsProgressRafRef.current = null;
    }
  }, []);

  const stopTransport = useCallback(() => {
    ttsResumeRef.current = null;
    stopCurrentAudio();
    currentAudioRef.current = null;

    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch((err) => {
        logger.warn("reader", "Failed to release wake lock", err);
      });
      wakeLockRef.current = null;
    }

    if ("mediaSession" in navigator && mediaSessionSetupRef.current) {
      navigator.mediaSession.playbackState = "none";
      mediaSessionSetupRef.current = false;
    }
  }, [stopCurrentAudio]);

  const playAudioSource = useCallback(
    async (source: string, sessionId: number, options?: PlayAudioOptions) => {
      if (ttsSessionRef.current !== sessionId) return;

      if (source === "") {
        options?.onEnd?.();
        return;
      }

      setupMediaSession();
      void requestWakeLock();

      if (!currentAudioRef.current) {
        const audio = new Audio();
        audio.preload = "auto";
        audio.setAttribute("playsinline", "true");
        audio.setAttribute("webkit-playsinline", "true");
        currentAudioRef.current = audio;
      }

      const audio = currentAudioRef.current;

      const dispose = () => {
        audio.ontimeupdate = null;
        audio.onended = null;
        audio.onerror = null;
        audio.onpause = null;
        audio.onplay = null;
        audio.onloadedmetadata = null;
        audio.ondurationchange = null;
        audio.onprogress = null;
        audio.oncanplay = null;
        if (ttsProgressRafRef.current !== null) {
          cancelAnimationFrame(ttsProgressRafRef.current);
          ttsProgressRafRef.current = null;
        }
      };

      await new Promise<void>((resolve, reject) => {
        audio.pause();
        audio.currentTime = 0;
        audio.src = source;

        audio.onended = () => {
          dispose();
          options?.onEnd?.();
          resolve();
        };

        audio.onerror = () => {
          dispose();
          options?.onCleanup?.();
          if (IS_DEV) {
            logger.warn("tts", "audio element onerror", options?.debugMeta);
          }
          reject(new Error("audio_play_error:MediaError"));
        };

        audio.play().catch((error) => {
          const reason =
            error instanceof DOMException
              ? error.name
              : error instanceof Error
                ? error.name || "UnknownError"
                : "UnknownError";

          if (reason === "NotAllowedError") {
            setIsPaused(true);
            ttsResumeRef.current = () => {
              if (ttsSessionRef.current !== sessionId) return;
              audio.play().catch(() => {
                setIsPaused(true);
              });
            };
            toast.error("播放被浏览器拦截，点击朗读按钮继续");

            if ("mediaSession" in navigator && mediaSessionSetupRef.current) {
              navigator.mediaSession.playbackState = "paused";
            }

            if (IS_DEV) {
              logger.warn("tts", "audio.play rejected", {
                ...options?.debugMeta,
                reason,
              });
            }

            return;
          }

          dispose();

          if (IS_DEV) {
            logger.warn("tts", "audio.play rejected", {
              ...options?.debugMeta,
              reason,
            });
          }

          reject(new Error(`audio_play_error:${reason}`));
        });
      });
    },
    [requestWakeLock, setIsPaused, setupMediaSession, ttsSessionRef]
  );

  const pausePlayback = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
    }
    setIsPaused(true);

    if ("mediaSession" in navigator && mediaSessionSetupRef.current) {
      navigator.mediaSession.playbackState = "paused";
    }
  }, [setIsPaused]);

  const resumePlayback = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current
        .play()
        .then(() => {
          ttsResumeRef.current = null;
          setIsPaused(false);
        })
        .catch((err) => {
          setIsPaused(true);
          logger.warn("tts", "Failed to resume audio", err);
        });
    }
    setIsTtsViewOpen(true);

    if ("mediaSession" in navigator && mediaSessionSetupRef.current) {
      navigator.mediaSession.playbackState = "playing";
    }
  }, [setIsPaused, setIsTtsViewOpen]);

  const hasPendingResume = useCallback(() => {
    return Boolean(ttsResumeRef.current);
  }, [ttsResumeRef]);

  const resumePendingPlayback = useCallback(() => {
    if (!ttsResumeRef.current) {
      return false;
    }

    setIsSpeaking(true);
    const resume = ttsResumeRef.current;
    ttsResumeRef.current = null;
    resume();
    return true;
  }, [setIsSpeaking]);

  return {
    hasPendingResume,
    pausePlayback,
    playAudioSource,
    resumePendingPlayback,
    resumePlayback,
    stopCurrentAudio,
    stopTransport,
  };
}
