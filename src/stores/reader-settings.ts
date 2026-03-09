import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface ReaderSettingsState {
  fontSize: number;
  theme: "light" | "dark" | "sepia";
  pageWidth: number;
  browserVoiceId: string;
  ttsRate: number;
  ttsPitch: number;
  ttsVolume: number;
  microsoftPreloadCount: number;
  ttsHighlightStyle: "background" | "indicator";
  ttsHighlightColor: string;
  loaded: boolean;
}

interface ReaderSettingsActions {
  setFontSize: (size: number) => void;
  setTheme: (theme: "light" | "dark" | "sepia") => void;
  setPageWidth: (width: number) => void;
  setBrowserVoiceId: (id: string) => void;
  setTtsRate: (rate: number) => void;
  setTtsPitch: (pitch: number) => void;
  setTtsVolume: (volume: number) => void;
  setMicrosoftPreloadCount: (count: number) => void;
  setTtsHighlightStyle: (style: "background" | "indicator") => void;
  setTtsHighlightColor: (color: string) => void;
  loadFromServer: () => Promise<void>;
  saveToServer: () => Promise<void>;
}

const DEFAULT_STATE: ReaderSettingsState = {
  fontSize: 16,
  theme: "light",
  pageWidth: 800,
  browserVoiceId: "",
  ttsRate: 1,
  ttsPitch: 1,
  ttsVolume: 1,
  microsoftPreloadCount: 3,
  ttsHighlightStyle: "indicator",
  ttsHighlightColor: "#3b82f6",
  loaded: false,
};

export const useReaderSettingsStore = create<
  ReaderSettingsState & ReaderSettingsActions
>()(
  devtools(
    (set, get) => ({
      ...DEFAULT_STATE,

      setFontSize: (size) => set({ fontSize: Math.min(28, Math.max(12, size)) }),
      setTheme: (theme) => set({ theme }),
      setPageWidth: (width) => set({ pageWidth: Math.min(1200, Math.max(600, width)) }),
      setBrowserVoiceId: (browserVoiceId) => set({ browserVoiceId }),
      setTtsRate: (rate) => set({ ttsRate: Math.min(5, Math.max(1, rate)) }),
      setTtsPitch: (pitch) => set({ ttsPitch: Math.min(2, Math.max(0.5, pitch)) }),
      setTtsVolume: (volume) => set({ ttsVolume: Math.min(1, Math.max(0, volume)) }),
      setMicrosoftPreloadCount: (count) =>
        set({ microsoftPreloadCount: [1, 2, 3, 5].includes(count) ? count : 3 }),
      setTtsHighlightStyle: (style: "background" | "indicator") => set({ ttsHighlightStyle: style }),
      setTtsHighlightColor: (color) => set({ ttsHighlightColor: color }),

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
                ? Math.min(28, Math.max(12, settings.fontSize))
                : DEFAULT_STATE.fontSize,
            theme: settings.theme || DEFAULT_STATE.theme,
            pageWidth:
              typeof settings.pageWidth === "number"
                ? Math.min(1200, Math.max(600, settings.pageWidth))
                : DEFAULT_STATE.pageWidth,
            browserVoiceId: settings.browserVoiceId || DEFAULT_STATE.browserVoiceId,
            ttsRate:
              typeof settings.ttsRate === "number"
                ? Math.min(5, Math.max(1, settings.ttsRate))
                : DEFAULT_STATE.ttsRate,
            ttsPitch:
              typeof settings.ttsPitch === "number"
                ? Math.min(2, Math.max(0.5, settings.ttsPitch))
                : DEFAULT_STATE.ttsPitch,
            ttsVolume:
              typeof settings.ttsVolume === "number"
                ? Math.min(1, Math.max(0, settings.ttsVolume))
                : DEFAULT_STATE.ttsVolume,
            microsoftPreloadCount: [1, 2, 3, 5].includes(
              settings.microsoftPreloadCount as number
            )
              ? (settings.microsoftPreloadCount as number)
              : DEFAULT_STATE.microsoftPreloadCount,
            ttsHighlightStyle: settings.ttsHighlightStyle || DEFAULT_STATE.ttsHighlightStyle,
            ttsHighlightColor: settings.ttsHighlightColor || DEFAULT_STATE.ttsHighlightColor,
            loaded: true,
          });
        } catch {
          // ignore
        }
      },

      saveToServer: async () => {
        const state = get();
        if (!state.loaded) return;

        try {
          await fetch("/api/reader-settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fontSize: state.fontSize,
              theme: state.theme,
              pageWidth: state.pageWidth,
              browserVoiceId: state.browserVoiceId,
              ttsRate: state.ttsRate,
              ttsPitch: state.ttsPitch,
              ttsVolume: state.ttsVolume,
              microsoftPreloadCount: state.microsoftPreloadCount,
              ttsHighlightStyle: state.ttsHighlightStyle,
              ttsHighlightColor: state.ttsHighlightColor,
            }),
          });
        } catch {
          // ignore
        }
      },
    }),
    { name: "reader-settings-store" }
  )
);

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function useDebouncedSettingsSave() {
  const saveToServer = useReaderSettingsStore((s) => s.saveToServer);
  const loaded = useReaderSettingsStore((s) => s.loaded);

  return () => {
    if (!loaded) return;

    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }

    saveTimer = setTimeout(() => {
      saveToServer();
    }, 220);
  };
}
