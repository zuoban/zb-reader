import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface ReaderSettingsState {
  fontSize: number;
  theme: "light" | "dark" | "sepia";
  ttsEngine: "browser" | "legado";
  browserVoiceId: string;
  ttsRate: number;
  ttsPitch: number;
  ttsVolume: number;
  microsoftPreloadCount: number;
  legadoRate: number;
  legadoConfigId: string;
  legadoPreloadCount: number;
  loaded: boolean;
}

interface ReaderSettingsActions {
  setFontSize: (size: number) => void;
  setTheme: (theme: "light" | "dark" | "sepia") => void;
  setTtsEngine: (engine: "browser" | "legado") => void;
  setBrowserVoiceId: (id: string) => void;
  setTtsRate: (rate: number) => void;
  setTtsPitch: (pitch: number) => void;
  setTtsVolume: (volume: number) => void;
  setMicrosoftPreloadCount: (count: number) => void;
  setLegadoRate: (rate: number) => void;
  setLegadoConfigId: (id: string) => void;
  setLegadoPreloadCount: (count: number) => void;
  loadFromServer: () => Promise<void>;
  saveToServer: () => Promise<void>;
}

const DEFAULT_STATE: ReaderSettingsState = {
  fontSize: 16,
  theme: "light",
  ttsEngine: "browser",
  browserVoiceId: "",
  ttsRate: 1,
  ttsPitch: 1,
  ttsVolume: 1,
  microsoftPreloadCount: 3,
  legadoRate: 50,
  legadoConfigId: "",
  legadoPreloadCount: 3,
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
      setTtsEngine: (ttsEngine) => set({ ttsEngine }),
      setBrowserVoiceId: (browserVoiceId) => set({ browserVoiceId }),
      setTtsRate: (rate) => set({ ttsRate: Math.min(5, Math.max(1, rate)) }),
      setTtsPitch: (pitch) => set({ ttsPitch: Math.min(2, Math.max(0.5, pitch)) }),
      setTtsVolume: (volume) => set({ ttsVolume: Math.min(1, Math.max(0, volume)) }),
      setMicrosoftPreloadCount: (count) =>
        set({ microsoftPreloadCount: [1, 2, 3, 5].includes(count) ? count : 3 }),
      setLegadoRate: (rate) =>
        set({ legadoRate: Math.min(500, Math.max(1, rate)) }),
      setLegadoConfigId: (legadoConfigId) => set({ legadoConfigId }),
      setLegadoPreloadCount: (count) =>
        set({ legadoPreloadCount: [1, 2, 3, 5].includes(count) ? count : 3 }),

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
            ttsEngine: settings.ttsEngine || DEFAULT_STATE.ttsEngine,
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
            legadoRate:
              typeof settings.legadoRate === "number"
                ? Math.min(500, Math.max(1, settings.legadoRate))
                : DEFAULT_STATE.legadoRate,
            legadoConfigId: settings.legadoConfigId || DEFAULT_STATE.legadoConfigId,
            legadoPreloadCount: [1, 2, 3, 5].includes(
              settings.legadoPreloadCount as number
            )
              ? (settings.legadoPreloadCount as number)
              : DEFAULT_STATE.legadoPreloadCount,
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
              ttsEngine: state.ttsEngine,
              browserVoiceId: state.browserVoiceId,
              ttsRate: state.ttsRate,
              ttsPitch: state.ttsPitch,
              ttsVolume: state.ttsVolume,
              microsoftPreloadCount: state.microsoftPreloadCount,
              legadoRate: state.legadoRate,
              legadoConfigId: state.legadoConfigId,
              legadoPreloadCount: state.legadoPreloadCount,
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
