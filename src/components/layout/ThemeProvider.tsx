"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

interface ThemeProviderProps {
  children: React.ReactNode;
  attribute?: "class";
  defaultTheme?: Theme;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
  storageKey?: string;
}

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  systemTheme: ResolvedTheme;
  themes: Theme[];
  setTheme: React.Dispatch<React.SetStateAction<Theme>>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getStoredTheme(storageKey: string, defaultTheme: Theme): Theme {
  if (typeof window === "undefined") return defaultTheme;

  try {
    const storedTheme = window.localStorage.getItem(storageKey);
    if (storedTheme === "light" || storedTheme === "dark" || storedTheme === "system") {
      return storedTheme;
    }
  } catch {
    // Ignore storage failures in private browsing or restricted contexts.
  }

  return defaultTheme;
}

function applyTheme(theme: Theme, systemTheme: ResolvedTheme, disableTransitionOnChange: boolean) {
  const root = document.documentElement;
  const resolvedTheme = theme === "system" ? systemTheme : theme;
  let restoreTransitions: (() => void) | undefined;

  if (disableTransitionOnChange) {
    const style = document.createElement("style");
    style.appendChild(
      document.createTextNode(
        "*,*::before,*::after{transition:none!important;animation-duration:0.001ms!important}"
      )
    );
    document.head.appendChild(style);
    restoreTransitions = () => {
      window.getComputedStyle(document.body);
      window.setTimeout(() => style.remove(), 1);
    };
  }

  root.classList.remove("light", "dark");
  root.classList.add(resolvedTheme);
  root.style.colorScheme = resolvedTheme;
  restoreTransitions?.();
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  enableSystem = true,
  disableTransitionOnChange = false,
  storageKey = "theme",
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => getStoredTheme(storageKey, defaultTheme));
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() => getSystemTheme());

  useEffect(() => {
    if (!enableSystem) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => setSystemTheme(getSystemTheme());

    handleChange();
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [enableSystem]);

  useEffect(() => {
    applyTheme(theme, systemTheme, disableTransitionOnChange);
  }, [disableTransitionOnChange, systemTheme, theme]);

  const setTheme = useCallback<React.Dispatch<React.SetStateAction<Theme>>>(
    (value) => {
      setThemeState((currentTheme) => {
        const nextTheme = typeof value === "function" ? value(currentTheme) : value;
        try {
          window.localStorage.setItem(storageKey, nextTheme);
        } catch {
          // Ignore storage failures in private browsing or restricted contexts.
        }
        return nextTheme;
      });
    },
    [storageKey]
  );

  const resolvedTheme = theme === "system" ? systemTheme : theme;
  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme,
      systemTheme,
      themes: enableSystem ? ["light", "dark", "system"] : ["light", "dark"],
      setTheme,
    }),
    [enableSystem, resolvedTheme, setTheme, systemTheme, theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      theme: "system",
      resolvedTheme: getSystemTheme(),
      systemTheme: getSystemTheme(),
      themes: ["light", "dark", "system"],
      setTheme: () => {},
    };
  }
  return context;
}
