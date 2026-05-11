"use client";

import { useEffect, useState } from "react";
import { READER_THEME_STYLES } from "@/lib/reader-theme";
import type { BrowserVoiceOption } from "@/lib/tts";
import type { FontFamily, TtsEngine, TtsHighlightStyle } from "@/stores/reader-settings";

interface ReaderSettingsLifecycleState {
  fontSize: number;
  theme: "light" | "dark" | "sepia";
  fontFamily: FontFamily;
  browserVoiceId: string;
  ttsRate: number;
  ttsPitch: number;
  ttsVolume: number;
  microsoftPreloadCount: number;
  ttsAutoNextChapter: boolean;
  ttsHighlightColor: string;
  autoScrollToActive: boolean;
  ttsEngine: TtsEngine;
  legadoRate: number;
  legadoConfigId: string | null;
  legadoPreloadCount: number;
  ttsImmersiveMode: boolean;
  ttsHighlightStyle: TtsHighlightStyle;
  loaded: boolean;
  loadFromServer: () => Promise<void>;
  setBrowserVoiceId: (id: string) => void;
}

export function useReaderSettingsLifecycle(
  settings: ReaderSettingsLifecycleState,
  debouncedSaveSettings: () => void
) {
  const [browserVoices, setBrowserVoices] = useState<BrowserVoiceOption[]>([]);
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
    settings.browserVoiceId,
    settings.ttsRate,
    settings.ttsPitch,
    settings.ttsVolume,
    settings.microsoftPreloadCount,
    settings.ttsAutoNextChapter,
    settings.ttsHighlightColor,
    settings.autoScrollToActive,
    settings.ttsEngine,
    settings.legadoRate,
    settings.legadoConfigId,
    settings.legadoPreloadCount,
    settings.ttsImmersiveMode,
    settings.ttsHighlightStyle,
  ]);

  useEffect(() => {
    if (!settings.loaded) return;

    const loadVoices = async () => {
      try {
        const res = await fetch("/api/tts/microsoft/voices");
        if (!res.ok) return;
        const data = (await res.json()) as { voices?: BrowserVoiceOption[] };
        const mapped = data.voices || [];
        setBrowserVoices(mapped);
        const currentVoiceId = settings.browserVoiceId;
        if (mapped.length > 0) {
          if (currentVoiceId && mapped.some((voice) => voice.id === currentVoiceId)) {
            return;
          }
          settings.setBrowserVoiceId(mapped[0].id);
        }
      } catch {
        // ignore
      }
    };

    loadVoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.loaded]);

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
    browserVoices,
    currentTheme,
  };
}
