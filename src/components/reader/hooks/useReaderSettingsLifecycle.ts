"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { READER_THEME_STYLES } from "@/lib/reader-theme";
import type { BrowserVoiceOption } from "@/lib/tts";
import type { FontFamily, TtsHighlightStyle } from "@/stores/reader-settings";

interface ReaderSettingsLifecycleState {
  fontSize: number;
  theme: "light" | "dark" | "sepia";
  fontFamily: FontFamily;
  ttsVoiceId: string;
  ttsRate: number;
  ttsPitch: number;
  ttsVolume: number;
  ttsPreloadCount: number;
  ttsHighlightColor: string;
  autoScrollToActive: boolean;
  ttsImmersiveMode: boolean;
  ttsHighlightStyle: TtsHighlightStyle;
  loaded: boolean;
  loadFromServer: () => Promise<void>;
  setTtsVoiceId: (id: string) => void;
}

export function useReaderSettingsLifecycle(
  settings: ReaderSettingsLifecycleState,
  debouncedSaveSettings: () => void
) {
  const [ttsVoices, setTtsVoices] = useState<BrowserVoiceOption[]>([]);
  const ttsVoicesLoadedRef = useRef(false);
  const {
    loaded,
    setTtsVoiceId,
    ttsVoiceId,
  } = settings;
  const currentTheme =
    READER_THEME_STYLES[settings.theme] || READER_THEME_STYLES.light;

  useEffect(() => {
    settings.loadFromServer();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadFromServer is stable
  }, []);

  useEffect(() => {
    if (!settings.loaded) return;
    debouncedSaveSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debouncedSaveSettings is stable
  }, [
    settings.fontSize,
    settings.theme,
    settings.fontFamily,
    settings.ttsVoiceId,
    settings.ttsRate,
    settings.ttsPitch,
    settings.ttsVolume,
    settings.ttsPreloadCount,
    settings.ttsHighlightColor,
    settings.autoScrollToActive,
    settings.ttsImmersiveMode,
    settings.ttsHighlightStyle,
  ]);

  const loadTtsVoices = useCallback(async () => {
    if (!loaded) return;
    if (ttsVoicesLoadedRef.current) return;

    try {
      const res = await fetch("/api/tts/microsoft/voices");
      if (!res.ok) return;
      const data = (await res.json()) as { voices?: BrowserVoiceOption[] };
      const mapped = data.voices || [];
      ttsVoicesLoadedRef.current = true;
      setTtsVoices(mapped);
      const currentVoiceId = ttsVoiceId;
      if (mapped.length > 0) {
        if (currentVoiceId && mapped.some((voice) => voice.id === currentVoiceId)) {
          return;
        }
        setTtsVoiceId(mapped[0].id);
      }
    } catch {
      // ignore
    }
  }, [loaded, setTtsVoiceId, ttsVoiceId]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--reader-bg", currentTheme.solidBg);
    root.style.setProperty("--reader-card-bg", currentTheme.cardBg);
    root.style.setProperty("--reader-text", currentTheme.text);
    root.style.setProperty("--reader-muted-text", currentTheme.mutedText);
    root.style.setProperty("--reader-border", currentTheme.border);
    root.style.setProperty("--reader-shadow", currentTheme.shadow);
    root.style.setProperty("--reader-primary", currentTheme.primary);
    root.style.setProperty("--reader-primary-light", currentTheme.primaryLight);
    root.style.setProperty("--reader-destructive", currentTheme.destructive);
  }, [currentTheme]);

  return {
    ttsVoices,
    currentTheme,
    loadTtsVoices,
  };
}
