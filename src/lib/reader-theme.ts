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
    bg: "bg-background",
    solidBg: "#ffffff",
    cardBg: "rgba(255, 255, 255, 0.95)",
    text: "#09090b",
    mutedText: "#71717a",
    border: "rgba(228, 228, 231, 0.7)",
    shadow: "rgba(0, 0, 0, 0.05)",
    primary: "#18181b",
    primaryLight: "rgba(24, 24, 27, 0.1)",
    destructive: "#ef4444",
  },
  dark: {
    bg: "bg-[#09090b]",
    solidBg: "#09090b",
    cardBg: "rgba(9, 9, 11, 0.95)",
    text: "#fafafa",
    mutedText: "#a1a1aa",
    border: "rgba(39, 39, 42, 0.7)",
    shadow: "rgba(0, 0, 0, 0.3)",
    primary: "#fafafa",
    primaryLight: "rgba(250, 250, 250, 0.1)",
    destructive: "#ef4444",
  },
  sepia: {
    bg: "bg-[#F5F1E8]",
    solidBg: "#F5F1E8",
    cardBg: "rgba(255, 250, 240, 0.92)",
    text: "#5B4636",
    mutedText: "#8B7355",
    border: "rgba(214, 201, 168, 0.5)",
    shadow: "rgba(91, 70, 54, 0.06)",
    primary: "#5B4636",
    primaryLight: "rgba(91, 70, 54, 0.1)",
    destructive: "#dc2626",
  },
};