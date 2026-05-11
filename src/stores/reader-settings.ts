import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { useRef, useEffect, useCallback } from "react";
import { useShallow } from "zustand/react/shallow";
import { logger } from "@/lib/logger";
import { toast } from "sonner";
import {
  clampFontSize,
  clampPageWidth,
  clampTtsRate,
  clampTtsPitch,
  clampTtsVolume,
  clampLegadoRate,
  normalizeMicrosoftPreloadCount,
  isValidFontFamily,
} from "@/lib/utils";

export type FontFamily = "system" | "serif" | "sans" | "kaiti";
export type FlipMode = "scroll" | "page";
export type TtsEngine = "browser" | "legado" | "microsoft";
export type TtsHighlightStyle = "background" | "indicator";

interface ReaderSettingsState {
  fontSize: number;
  theme: "light" | "dark" | "sepia";
  fontFamily: FontFamily;
  pageWidth: number;
  browserVoiceId: string;
  ttsRate: number;
  ttsPitch: number;
  ttsVolume: number;
  microsoftPreloadCount: number;
  ttsHighlightColor: string;
  ttsAutoNextChapter: boolean;
  autoScrollToActive: boolean;
  flipMode: FlipMode;
  ttsEngine: TtsEngine;
  legadoRate: number;
  legadoConfigId: string | null;
  legadoPreloadCount: number;
  ttsImmersiveMode: boolean;
  ttsHighlightStyle: TtsHighlightStyle;
  loaded: boolean;
}

interface ReaderSettingsActions {
  setFontSize: (size: number) => void;
  setTheme: (theme: "light" | "dark" | "sepia") => void;
  setFontFamily: (fontFamily: FontFamily) => void;
  setPageWidth: (width: number) => void;
  setBrowserVoiceId: (id: string) => void;
  setTtsRate: (rate: number) => void;
  setTtsPitch: (pitch: number) => void;
  setTtsVolume: (volume: number) => void;
  setMicrosoftPreloadCount: (count: number) => void;
  setTtsHighlightColor: (color: string) => void;
  setTtsAutoNextChapter: (enabled: boolean) => void;
  setAutoScrollToActive: (enabled: boolean) => void;
  setFlipMode: (mode: FlipMode) => void;
  setTtsEngine: (engine: TtsEngine) => void;
  setLegadoRate: (rate: number) => void;
  setLegadoConfigId: (id: string | null) => void;
  setLegadoPreloadCount: (count: number) => void;
  setTtsImmersiveMode: (enabled: boolean) => void;
  setTtsHighlightStyle: (style: TtsHighlightStyle) => void;
  loadFromServer: () => Promise<void>;
  saveToServer: () => Promise<void>;
}

const DEFAULT_STATE: ReaderSettingsState = {
  fontSize: 16,
  theme: "light",
  fontFamily: "system",
  pageWidth: 100,
  browserVoiceId: "",
  ttsRate: 1,
  ttsPitch: 1,
  ttsVolume: 1,
  microsoftPreloadCount: 5,
  ttsHighlightColor: "#3b82f6",
  ttsAutoNextChapter: true,
  autoScrollToActive: true,
  flipMode: "scroll",
  ttsEngine: "browser",
  legadoRate: 50,
  legadoConfigId: null,
  legadoPreloadCount: 3,
  ttsImmersiveMode: false,
  ttsHighlightStyle: "indicator",
  loaded: false,
};

export const useReaderSettingsStore = create<
  ReaderSettingsState & ReaderSettingsActions
>()(
  devtools(
    (set, get) => ({
      ...DEFAULT_STATE,

      setFontSize: (size) => set({ fontSize: clampFontSize(size) }),
      setTheme: (theme) => set({ theme }),
      setFontFamily: (fontFamily: FontFamily) => set({ fontFamily }),
      setPageWidth: (width) => set({ pageWidth: clampPageWidth(width) }),
      setBrowserVoiceId: (browserVoiceId) => set({ browserVoiceId }),
      setTtsRate: (rate) => set({ ttsRate: clampTtsRate(rate) }),
      setTtsPitch: (pitch) => set({ ttsPitch: clampTtsPitch(pitch) }),
      setTtsVolume: (volume) => set({ ttsVolume: clampTtsVolume(volume) }),
      setMicrosoftPreloadCount: (count) =>
        set({ microsoftPreloadCount: normalizeMicrosoftPreloadCount(count) }),
      setTtsHighlightColor: (color) => set({ ttsHighlightColor: color }),
      setTtsAutoNextChapter: (enabled) => set({ ttsAutoNextChapter: enabled }),
      setAutoScrollToActive: (enabled) => set({ autoScrollToActive: enabled }),
      setFlipMode: (flipMode) => set({ flipMode }),
      setTtsEngine: (ttsEngine) => set({ ttsEngine }),
      setLegadoRate: (rate) => set({ legadoRate: clampLegadoRate(rate) }),
      setLegadoConfigId: (legadoConfigId) => set({ legadoConfigId }),
      setLegadoPreloadCount: (legadoPreloadCount) => set({ legadoPreloadCount }),
      setTtsImmersiveMode: (ttsImmersiveMode) => set({ ttsImmersiveMode }),
      setTtsHighlightStyle: (ttsHighlightStyle) => set({ ttsHighlightStyle }),

      loadFromServer: async () => {
        try {
          const res = await fetch("/api/reader-settings");
          if (!res.ok) return;

          const data = (await res.json()) as {
            settings?: Partial<ReaderSettingsState>;
          };

          const settings = data.settings;
          if (!settings) return;

          set({
            fontSize:
              typeof settings.fontSize === "number"
                ? clampFontSize(settings.fontSize)
                : DEFAULT_STATE.fontSize,
            theme: settings.theme || DEFAULT_STATE.theme,
            fontFamily: isValidFontFamily(settings.fontFamily as string)
              ? (settings.fontFamily as FontFamily)
              : DEFAULT_STATE.fontFamily,
            pageWidth:
              typeof settings.pageWidth === "number"
                ? clampPageWidth(settings.pageWidth)
                : DEFAULT_STATE.pageWidth,
            browserVoiceId: settings.browserVoiceId || DEFAULT_STATE.browserVoiceId,
            ttsRate:
              typeof settings.ttsRate === "number"
                ? clampTtsRate(settings.ttsRate)
                : DEFAULT_STATE.ttsRate,
            ttsPitch:
              typeof settings.ttsPitch === "number"
                ? clampTtsPitch(settings.ttsPitch)
                : DEFAULT_STATE.ttsPitch,
            ttsVolume:
              typeof settings.ttsVolume === "number"
                ? clampTtsVolume(settings.ttsVolume)
                : DEFAULT_STATE.ttsVolume,
            microsoftPreloadCount:
              typeof settings.microsoftPreloadCount === "number"
                ? normalizeMicrosoftPreloadCount(settings.microsoftPreloadCount)
                : DEFAULT_STATE.microsoftPreloadCount,
            ttsHighlightColor: settings.ttsHighlightColor || DEFAULT_STATE.ttsHighlightColor,
            ttsAutoNextChapter: settings.ttsAutoNextChapter ?? DEFAULT_STATE.ttsAutoNextChapter,
            autoScrollToActive: settings.autoScrollToActive ?? DEFAULT_STATE.autoScrollToActive,
            flipMode: settings.flipMode || DEFAULT_STATE.flipMode,
            ttsEngine: settings.ttsEngine || DEFAULT_STATE.ttsEngine,
            legadoRate:
              typeof settings.legadoRate === "number"
                ? clampLegadoRate(settings.legadoRate)
                : DEFAULT_STATE.legadoRate,
            legadoConfigId: settings.legadoConfigId ?? DEFAULT_STATE.legadoConfigId,
            legadoPreloadCount: settings.legadoPreloadCount || DEFAULT_STATE.legadoPreloadCount,
            ttsImmersiveMode: settings.ttsImmersiveMode ?? DEFAULT_STATE.ttsImmersiveMode,
            ttsHighlightStyle: settings.ttsHighlightStyle || DEFAULT_STATE.ttsHighlightStyle,
            loaded: true,
          });
        } catch (error) {
          logger.warn("reader-settings", "Failed to load settings from server", error);
        }
      },

      saveToServer: async () => {
        const state = get();
        if (!state.loaded) return;

        try {
          const res = await fetch("/api/reader-settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fontSize: state.fontSize,
              theme: state.theme,
              fontFamily: state.fontFamily,
              pageWidth: state.pageWidth,
              browserVoiceId: state.browserVoiceId,
              ttsRate: state.ttsRate,
              ttsPitch: state.ttsPitch,
              ttsVolume: state.ttsVolume,
              microsoftPreloadCount: state.microsoftPreloadCount,
              ttsHighlightColor: state.ttsHighlightColor,
              ttsAutoNextChapter: state.ttsAutoNextChapter,
              autoScrollToActive: state.autoScrollToActive,
              flipMode: state.flipMode,
              ttsEngine: state.ttsEngine,
              legadoRate: state.legadoRate,
              legadoConfigId: state.legadoConfigId,
              legadoPreloadCount: state.legadoPreloadCount,
              ttsImmersiveMode: state.ttsImmersiveMode,
              ttsHighlightStyle: state.ttsHighlightStyle,
            }),
          });

          if (!res.ok) {
            if (res.status === 401) {
              logger.warn("reader-settings", "Session expired, skipping save");
              return;
            }
            const errorText = await res.text().catch(() => "");
            logger.warn("reader-settings", `Server error ${res.status}: ${errorText}`);
            toast.error("设置保存失败，请稍后重试");
          }
        } catch (error) {
          logger.warn("reader-settings", "Failed to save settings to server", error);
          toast.error("设置保存失败，请检查网络连接");
        }
      },
    }),
    { name: "reader-settings-store" }
  )
);

export function useDebouncedSettingsSave() {
  const saveToServer = useReaderSettingsStore((s) => s.saveToServer);
  const loaded = useReaderSettingsStore((s) => s.loaded);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveFnRef = useRef(saveToServer);

  // Keep saveFnRef in sync without triggering useCallback changes
  useEffect(() => {
    saveFnRef.current = saveToServer;
  }, [saveToServer]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, []);

  return useCallback(() => {
    if (!loaded) return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      saveFnRef.current();
    }, 220);
  }, [loaded]);
}

export function useReaderSettingsValues() {
  return useReaderSettingsStore(
    useShallow((s) => ({
      fontSize: s.fontSize,
      fontFamily: s.fontFamily,
      theme: s.theme,
      browserVoiceId: s.browserVoiceId,
      ttsRate: s.ttsRate,
      microsoftPreloadCount: s.microsoftPreloadCount,
      ttsAutoNextChapter: s.ttsAutoNextChapter,
      ttsHighlightColor: s.ttsHighlightColor,
      flipMode: s.flipMode,
      ttsEngine: s.ttsEngine,
      legadoRate: s.legadoRate,
      legadoPreloadCount: s.legadoPreloadCount,
    }))
  );
}

export function useReaderSettingsLifecycleState() {
  const values = useReaderSettingsValues();
  const autoScrollToActive = useReaderSettingsStore((s) => s.autoScrollToActive);
  const loaded = useReaderSettingsStore((s) => s.loaded);
  const loadFromServer = useReaderSettingsStore((s) => s.loadFromServer);
  const setBrowserVoiceId = useReaderSettingsStore((s) => s.setBrowserVoiceId);

  return {
    ...values,
    autoScrollToActive,
    loaded,
    loadFromServer,
    setBrowserVoiceId,
  };
}

export function useReaderSettingsControlsState() {
  const setBrowserVoiceId = useReaderSettingsStore((s) => s.setBrowserVoiceId);
  const setFontFamily = useReaderSettingsStore((s) => s.setFontFamily);
  const setFontSize = useReaderSettingsStore((s) => s.setFontSize);
  const setTheme = useReaderSettingsStore((s) => s.setTheme);

  return {
    setBrowserVoiceId,
    setFontFamily,
    setFontSize,
    setTheme,
  };
}
