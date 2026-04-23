"use client";

import { useCallback } from "react";
import type { FontFamily } from "@/stores/reader-settings";

interface ReaderSettingsControlsState {
  setBrowserVoiceId: (id: string) => void;
  setFontFamily: (fontFamily: FontFamily) => void;
  setFontSize: (size: number) => void;
  setTheme: (theme: "light" | "dark" | "sepia") => void;
}

export function useReaderSettingsControls(settings: ReaderSettingsControlsState) {
  const handleFontSizeChange = useCallback(
    (size: number) => {
      settings.setFontSize(size);
    },
    [settings]
  );

  const handleFontFamilyChange = useCallback(
    (family: FontFamily) => {
      settings.setFontFamily(family);
    },
    [settings]
  );

  const handleThemeChange = useCallback(
    async (theme: "light" | "dark" | "sepia") => {
      settings.setTheme(theme);
    },
    [settings]
  );

  const handleSelectedBrowserVoiceIdChange = useCallback(
    (voiceId: string) => {
      settings.setBrowserVoiceId(voiceId);
    },
    [settings]
  );

  return {
    handleFontFamilyChange,
    handleFontSizeChange,
    handleSelectedBrowserVoiceIdChange,
    handleThemeChange,
  };
}
