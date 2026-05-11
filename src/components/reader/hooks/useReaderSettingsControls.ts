"use client";

import { useCallback } from "react";
import type { FontFamily } from "@/stores/reader-settings";

interface ReaderSettingsControlsState {
  setTtsVoiceId: (id: string) => void;
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

  const handleSelectedTtsVoiceIdChange = useCallback(
    (voiceId: string) => {
      settings.setTtsVoiceId(voiceId);
    },
    [settings]
  );

  return {
    handleFontFamilyChange,
    handleFontSizeChange,
    handleSelectedTtsVoiceIdChange,
    handleThemeChange,
  };
}
