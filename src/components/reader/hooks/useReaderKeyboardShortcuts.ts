"use client";

import { useEffect } from "react";

interface UseReaderKeyboardShortcutsParams {
  onBack: () => void | Promise<void>;
}

export function useReaderKeyboardShortcuts({
  onBack,
}: UseReaderKeyboardShortcutsParams) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        void onBack();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onBack]);
}
