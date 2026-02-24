import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

interface TtsFloatingPosition {
  x: number;
  y: number;
}

interface TtsFloatingStore {
  position: TtsFloatingPosition;
  setPosition: (position: TtsFloatingPosition) => void;
}

const DEFAULT_POSITION: TtsFloatingPosition = {
  x: 16,
  y: 80,
};

export const useTtsFloatingStore = create<TtsFloatingStore>()(
  persist(
    devtools(
      (set) => ({
        position: DEFAULT_POSITION,
        setPosition: (position) => set({ position }),
      }),
      { name: "tts-floating-store" }
    ),
    {
      name: "tts-floating-position",
      partialize: (state) => ({ position: state.position }),
    }
  )
);
