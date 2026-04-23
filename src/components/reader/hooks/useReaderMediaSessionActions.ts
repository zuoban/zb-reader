"use client";

import { useEffect } from "react";

interface UseReaderMediaSessionActionsParams {
  hasPendingResume: () => boolean;
  isPaused: boolean;
  isSpeaking: boolean;
  onNext: () => void;
  onPause: () => void;
  onPrev: () => void;
  onResumePending: () => boolean;
  onStop: () => void;
}

export function useReaderMediaSessionActions({
  hasPendingResume,
  isPaused,
  isSpeaking,
  onNext,
  onPause,
  onPrev,
  onResumePending,
  onStop,
}: UseReaderMediaSessionActionsParams) {
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;

    navigator.mediaSession.setActionHandler("play", () => {
      if (!isSpeaking && hasPendingResume()) {
        onResumePending();
      }
      navigator.mediaSession.playbackState = "playing";
    });

    navigator.mediaSession.setActionHandler("pause", () => {
      if (isSpeaking && !isPaused) {
        onPause();
      }
      navigator.mediaSession.playbackState = "paused";
    });

    navigator.mediaSession.setActionHandler("stop", onStop);
    navigator.mediaSession.setActionHandler("previoustrack", onPrev);
    navigator.mediaSession.setActionHandler("nexttrack", onNext);

    return () => {
      navigator.mediaSession.setActionHandler("play", null);
      navigator.mediaSession.setActionHandler("pause", null);
      navigator.mediaSession.setActionHandler("stop", null);
      navigator.mediaSession.setActionHandler("previoustrack", null);
      navigator.mediaSession.setActionHandler("nexttrack", null);
    };
  }, [
    hasPendingResume,
    isPaused,
    isSpeaking,
    onNext,
    onPause,
    onPrev,
    onResumePending,
    onStop,
  ]);
}
