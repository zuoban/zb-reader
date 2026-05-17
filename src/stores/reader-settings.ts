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
  normalizeTtsPreloadCount,
  isValidFontFamily,
} from "@/lib/utils";

export type FontFamily = "system" | "serif" | "sans" | "kaiti";
export type FlipMode = "scroll" | "page";
export type TtsHighlightStyle = "background" | "indicator";

interface ReaderSettingsState {
  fontSize: number;
  theme: "light" | "dark" | "sepia";
  fontFamily: FontFamily;
  pageWidth: number;
  ttsVoiceId: string;
  ttsRate: number;
  ttsPitch: number;
  ttsVolume: number;
  ttsPreloadCount: number;
  ttsHighlightColor: string;
  autoScrollToActive: boolean;
  flipMode: FlipMode;
  ttsImmersiveMode: boolean;
  ttsHighlightStyle: TtsHighlightStyle;
  loaded: boolean;
}

interface ReaderSettingsActions {
  setFontSize: (size: number) => void;
  setTheme: (theme: "light" | "dark" | "sepia") => void;
  setFontFamily: (fontFamily: FontFamily) => void;
  setPageWidth: (width: number) => void;
  setTtsVoiceId: (id: string) => void;
  setTtsRate: (rate: number) => void;
  setTtsPitch: (pitch: number) => void;
  setTtsVolume: (volume: number) => void;
  setTtsPreloadCount: (count: number) => void;
  setTtsHighlightColor: (color: string) => void;
  setAutoScrollToActive: (enabled: boolean) => void;
  setFlipMode: (mode: FlipMode) => void;
  setTtsImmersiveMode: (enabled: boolean) => void;
  setTtsHighlightStyle: (style: TtsHighlightStyle) => void;
  loadFromServer: () => Promise<void>;
  saveToServer: () => Promise<void>;
}

type ReaderSettingsApiResponse = Partial<ReaderSettingsState> & {
  browserVoiceId?: string;
  microsoftPreloadCount?: number;
};

const DEFAULT_STATE: ReaderSettingsState = {
  fontSize: 16,
  theme: "light",
  fontFamily: "system",
  pageWidth: 100,
  ttsVoiceId: "",
  ttsRate: 1,
  ttsPitch: 1,
  ttsVolume: 1,
  ttsPreloadCount: 5,
  ttsHighlightColor: "#3b82f6",
  autoScrollToActive: true,
  flipMode: "scroll",
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
      setTtsVoiceId: (ttsVoiceId) => set({ ttsVoiceId }),
      setTtsRate: (rate) => set({ ttsRate: clampTtsRate(rate) }),
      setTtsPitch: (pitch) => set({ ttsPitch: clampTtsPitch(pitch) }),
      setTtsVolume: (volume) => set({ ttsVolume: clampTtsVolume(volume) }),
      setTtsPreloadCount: (count) =>
        set({ ttsPreloadCount: normalizeTtsPreloadCount(count) }),
      setTtsHighlightColor: (color) => set({ ttsHighlightColor: color }),
      setAutoScrollToActive: (enabled) => set({ autoScrollToActive: enabled }),
      setFlipMode: (flipMode) => set({ flipMode }),
      setTtsImmersiveMode: (ttsImmersiveMode) => set({ ttsImmersiveMode }),
      setTtsHighlightStyle: (ttsHighlightStyle) => set({ ttsHighlightStyle }),

      loadFromServer: async () => {
        try {
          const res = await fetch("/api/reader-settings");
          if (!res.ok) return;

          const data = (await res.json()) as {
            settings?: ReaderSettingsApiResponse;
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
            ttsVoiceId: settings.browserVoiceId || DEFAULT_STATE.ttsVoiceId,
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
            ttsPreloadCount:
              typeof settings.microsoftPreloadCount === "number"
                ? normalizeTtsPreloadCount(settings.microsoftPreloadCount)
                : DEFAULT_STATE.ttsPreloadCount,
            ttsHighlightColor: settings.ttsHighlightColor || DEFAULT_STATE.ttsHighlightColor,
            autoScrollToActive: settings.autoScrollToActive ?? DEFAULT_STATE.autoScrollToActive,
            flipMode: settings.flipMode || DEFAULT_STATE.flipMode,
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
              browserVoiceId: state.ttsVoiceId,
              ttsRate: state.ttsRate,
              ttsPitch: state.ttsPitch,
              ttsVolume: state.ttsVolume,
              microsoftPreloadCount: state.ttsPreloadCount,
              ttsHighlightColor: state.ttsHighlightColor,
              autoScrollToActive: state.autoScrollToActive,
              flipMode: state.flipMode,
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
      ttsVoiceId: s.ttsVoiceId,
      ttsRate: s.ttsRate,
      ttsPitch: s.ttsPitch,
      ttsVolume: s.ttsVolume,
      ttsPreloadCount: s.ttsPreloadCount,
      ttsHighlightColor: s.ttsHighlightColor,
      flipMode: s.flipMode,
      ttsImmersiveMode: s.ttsImmersiveMode,
      ttsHighlightStyle: s.ttsHighlightStyle,
    }))
  );
}

export function useReaderSettingsLifecycleState() {
  const values = useReaderSettingsValues();
  const autoScrollToActive = useReaderSettingsStore((s) => s.autoScrollToActive);
  const loaded = useReaderSettingsStore((s) => s.loaded);
  const loadFromServer = useReaderSettingsStore((s) => s.loadFromServer);
  const setTtsVoiceId = useReaderSettingsStore((s) => s.setTtsVoiceId);

  return {
    ...values,
    autoScrollToActive,
    loaded,
    loadFromServer,
    setTtsVoiceId,
  };
}

export function useReaderSettingsControlsState() {
  const setTtsVoiceId = useReaderSettingsStore((s) => s.setTtsVoiceId);
  const setFontFamily = useReaderSettingsStore((s) => s.setFontFamily);
  const setFontSize = useReaderSettingsStore((s) => s.setFontSize);
  const setTheme = useReaderSettingsStore((s) => s.setTheme);

  return {
    setTtsVoiceId,
    setFontFamily,
    setFontSize,
    setTheme,
  };
}
