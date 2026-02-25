import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

interface TtsFloatingPosition {
  x: number;
  y: number;
}

interface TtsFloatingStore {
  position: TtsFloatingPosition;
  isInitialized: boolean;
  setPosition: (position: TtsFloatingPosition) => void;
  initializePosition: () => void;
}

const getDefaultPosition = (): TtsFloatingPosition => {
  if (typeof window === "undefined") {
    return { x: 16, y: 80 };
  }
  return {
    x: Math.max(16, Math.floor(window.innerWidth * 0.5)),
    y: Math.max(80, Math.floor(window.innerHeight * 0.7)),
  };
};

export const useTtsFloatingStore = create<TtsFloatingStore>()(
  persist(
    devtools(
      (set, get) => ({
        position: { x: 16, y: 80 },
        isInitialized: false,
        setPosition: (position) => set({ position }),
        initializePosition: () => {
          if (get().isInitialized) return;
          const stored = get().position;
          if (stored.x === 16 && stored.y === 80) {
            set({ position: getDefaultPosition(), isInitialized: true });
          } else {
            set({ isInitialized: true });
          }
        },
      }),
      { name: "tts-floating-store" }
    ),
    {
      name: "tts-floating-position",
      partialize: (state) => ({ position: state.position }),
    }
  )
);
