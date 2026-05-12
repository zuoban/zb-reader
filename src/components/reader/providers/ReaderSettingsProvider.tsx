"use client";

import React, { createContext, useContext } from "react";
import { useReaderSettingsLifecycle } from "@/components/reader/hooks";
import { 
  useReaderSettingsLifecycleState, 
  useDebouncedSettingsSave,
  useReaderSettingsValues
} from "@/stores/reader-settings";
import { READER_THEME_STYLES } from "@/lib/reader-theme";

interface ReaderSettingsContextValue {
  ttsVoices: any[];
  currentTheme: any;
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
