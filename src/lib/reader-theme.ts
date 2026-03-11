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
    bg: "bg-[#f8f8f7]",
    solidBg: "#f8f8f7",
    cardBg: "rgba(255, 255, 255, 0.88)",
    text: "#171717",
    mutedText: "#666666",
    border: "rgba(230, 229, 225, 0.95)",
    shadow: "rgba(23, 23, 23, 0.12)",
    primary: "#171717",
    primaryLight: "rgba(23, 23, 23, 0.1)",
    destructive: "#dc2626",
  },
  dark: {
    bg: "bg-[#121212]",
    solidBg: "#121212",
    cardBg: "rgba(26, 26, 26, 0.9)",
    text: "#f5f5f5",
    mutedText: "#a3a3a3",
    border: "rgba(49, 49, 49, 0.95)",
    shadow: "rgba(0, 0, 0, 0.35)",
    primary: "#e0bc4b",
    primaryLight: "rgba(224, 188, 75, 0.16)",
    destructive: "#f87171",
  },
  sepia: {
    bg: "bg-[#f4ecd8]",
    solidBg: "#f4ecd8",
    cardBg: "rgba(250, 241, 219, 0.9)",
    text: "#5b4636",
    mutedText: "#8b7355",
    border: "rgba(214, 201, 168, 0.8)",
    shadow: "rgba(91, 70, 54, 0.08)",
    primary: "#8a6b2f",
    primaryLight: "rgba(138, 107, 47, 0.16)",
    destructive: "#c2410c",
  },
};