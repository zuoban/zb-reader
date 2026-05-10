export interface ReaderThemeStyle {
  bg: string;
  solidBg: string;
  cardBg: string;
  text: string;
  mutedText: string;
  border: string;
  shadow: string;
  primary: string;
  primaryLight: string;
  destructive: string;
}

export const READER_THEME_STYLES: Record<string, ReaderThemeStyle> = {
  light: {
    bg: "bg-[#ffffff]",
    solidBg: "#ffffff",
    cardBg: "rgba(255, 255, 255, 0.98)",
    text: "#171717",
    mutedText: "#737373",
    border: "#e5e5e5",
    shadow: "rgba(0, 0, 0, 0.05)",
    primary: "#171717",
    primaryLight: "rgba(23, 23, 23, 0.05)",
    destructive: "#ef4444",
  },
  dark: {
    bg: "bg-[#0a0a0a]",
    solidBg: "#0a0a0a",
    cardBg: "rgba(10, 10, 10, 0.98)",
    text: "#ededed",
    mutedText: "#a3a3a3",
    border: "#262626",
    shadow: "rgba(0, 0, 0, 0.5)",
    primary: "#ededed",
    primaryLight: "rgba(237, 237, 237, 0.1)",
    destructive: "#f87171",
  },
  sepia: {
    bg: "bg-[#F5F1E8]",
    solidBg: "#F5F1E8",
    cardBg: "rgba(245, 241, 232, 0.98)",
    text: "#5B4636",
    mutedText: "#8B7355",
    border: "rgba(91, 70, 54, 0.1)",
    shadow: "rgba(91, 70, 54, 0.04)",
    primary: "#5B4636",
    primaryLight: "rgba(91, 70, 54, 0.05)",
    destructive: "#dc2626",
  },
};
