"use client";

import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

interface UseReaderTtsAudioParams {
  bookTitle?: string | null;
  bookAuthor?: string | null;
  activeTtsParagraph: string;
  currentParagraphIndexRef: React.MutableRefObject<number>;
  isPaused: boolean;
  isSpeaking: boolean;
  requestMicrosoftSpeech: (text: string, options?: { prefetch?: boolean }) => Promise<string>;
  selectedBrowserVoiceId: string;
  setIsPaused: (value: boolean) => void;
  setIsSpeaking: (value: boolean) => void;
  setIsTtsViewOpen: (value: boolean) => void;
  ttsRate: number;
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
  activeTtsParagraph,
  currentParagraphIndexRef,
  isPaused,
  isSpeaking,
  requestMicrosoftSpeech,
  selectedBrowserVoiceId,
  setIsPaused,
  setIsSpeaking,
  setIsTtsViewOpen,
  ttsRate,
  ttsSessionRef,
}: UseReaderTtsAudioParams) {
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const ttsProgressRafRef = useRef<number | null>(null);
  const ttsResumeRef = useRef<(() => void) | null>(null);
  const prevTtsSettingsRef = useRef({ rate: ttsRate, voiceId: selectedBrowserVoiceId });
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

          dispose();

          if (reason === "NotAllowedError") {
            ttsResumeRef.current = () => {
              if (ttsSessionRef.current !== sessionId) return;
              audio.play().catch(() => {
                // user can click again to retry resume
              });
            };
            toast.error("播放被浏览器拦截，点击朗读按钮继续");
          }

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
    [requestWakeLock, setupMediaSession, ttsSessionRef]
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
      currentAudioRef.current.play().catch((err) => {
        logger.warn("tts", "Failed to resume audio", err);
      });
    }
    setIsPaused(false);
    setIsTtsViewOpen(true);

    if ("mediaSession" in navigator && mediaSessionSetupRef.current) {
      navigator.mediaSession.playbackState = "playing";
    }
  }, [setIsPaused, setIsTtsViewOpen]);

  const hasPendingResume = useCallback(() => {
    return Boolean(ttsResumeRef.current);
  }, []);

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

  useEffect(() => {
    const prev = prevTtsSettingsRef.current;
    const current = { rate: ttsRate, voiceId: selectedBrowserVoiceId };
    const hasChanged = prev.rate !== current.rate || prev.voiceId !== current.voiceId;

    prevTtsSettingsRef.current = current;

    if (!hasChanged || !isSpeaking || !activeTtsParagraph || isPaused) {
      return;
    }

    const replayCurrentTtsParagraph = async () => {
      const currentIndex = currentParagraphIndexRef.current;

      ttsSessionRef.current += 1;
      const sessionId = ttsSessionRef.current;
      ttsResumeRef.current = null;

      stopCurrentAudio();

      try {
        const objectUrl = await requestMicrosoftSpeech(activeTtsParagraph);
        if (ttsSessionRef.current !== sessionId) {
          return;
        }

        await playAudioSource(objectUrl, sessionId, {
          debugMeta: { engine: "microsoft", sentenceIndex: currentIndex },
        });
      } catch {
        // ignore replay errors caused by settings switch
      }
    };

    void replayCurrentTtsParagraph();
  }, [
    activeTtsParagraph,
    currentParagraphIndexRef,
    isPaused,
    isSpeaking,
    playAudioSource,
    requestMicrosoftSpeech,
    selectedBrowserVoiceId,
    stopCurrentAudio,
    ttsRate,
    ttsSessionRef,
  ]);

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
