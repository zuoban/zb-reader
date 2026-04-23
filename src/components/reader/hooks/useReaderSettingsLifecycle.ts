"use client";

import { useEffect, useState } from "react";
import { READER_THEME_STYLES } from "@/lib/reader-theme";
import type { BrowserVoiceOption } from "@/lib/tts";
import type { FontFamily } from "@/stores/reader-settings";

interface ReaderSettingsLifecycleState {
  fontSize: number;
  theme: "light" | "dark" | "sepia";
  fontFamily: FontFamily;
  browserVoiceId: string;
  ttsRate: number;
  microsoftPreloadCount: number;
  ttsAutoNextChapter: boolean;
  ttsHighlightColor: string;
  autoScrollToActive: boolean;
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
  }, []);

  useEffect(() => {
    if (!settings.loaded) return;
    debouncedSaveSettings();
  }, [
    settings.fontSize,
    settings.theme,
    settings.fontFamily,
    settings.browserVoiceId,
    settings.ttsRate,
    settings.microsoftPreloadCount,
    settings.ttsAutoNextChapter,
    settings.ttsHighlightColor,
    settings.autoScrollToActive,
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
