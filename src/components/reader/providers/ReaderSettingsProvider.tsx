"use client";

import React, { createContext, useContext } from "react";
import { useReaderSettingsLifecycle } from "@/components/reader/hooks";
import { 
  useReaderSettingsLifecycleState, 
  useDebouncedSettingsSave,
  useReaderSettingsValues
} from "@/stores/reader-settings";
import type { BrowserVoiceOption } from "@/lib/tts";
import type { ReaderThemeStyle } from "@/lib/reader-theme";

interface ReaderSettingsContextValue {
  ttsVoices: BrowserVoiceOption[];
  currentTheme: ReaderThemeStyle;
  readerTheme: string;
}

const ReaderSettingsContext = createContext<ReaderSettingsContextValue | null>(null);

export function ReaderSettingsProvider({ children }: { children: React.ReactNode }) {
  const settingsLifecycleState = useReaderSettingsLifecycleState();
  const debouncedSaveSettings = useDebouncedSettingsSave();
  const { theme } = useReaderSettingsValues();

  const { ttsVoices, currentTheme } = useReaderSettingsLifecycle(
    settingsLifecycleState,
    debouncedSaveSettings
  );

  const value = {
    ttsVoices,
    currentTheme,
    readerTheme: theme,
  };

  return (
    <ReaderSettingsContext.Provider value={value}>
      {children}
    </ReaderSettingsContext.Provider>
  );
}

export function useReaderSettings() {
  const context = useContext(ReaderSettingsContext);
  if (!context) {
    throw new Error("useReaderSettings must be used within a ReaderSettingsProvider");
  }
  return context;
}
