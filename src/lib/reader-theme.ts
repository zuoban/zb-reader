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
    bg: "bg-[#f5f7fb]",
    solidBg: "#f5f7fb",
    cardBg: "rgba(245, 247, 251, 0.94)",
    text: "#09090b",
    mutedText: "#71717a",
    border: "rgba(228, 228, 231, 0.7)",
    shadow: "rgba(0, 0, 0, 0.05)",
    primary: "#18181b",
    primaryLight: "rgba(24, 24, 27, 0.1)",
    destructive: "#ef4444",
  },
  dark: {
    bg: "bg-[#101419]",
    solidBg: "#101419",
    cardBg: "rgba(20, 25, 31, 0.92)",
    text: "#d8dee7",
    mutedText: "#8f9aa8",
    border: "rgba(99, 115, 129, 0.28)",
    shadow: "rgba(0, 0, 0, 0.42)",
    primary: "#c9d7e8",
    primaryLight: "rgba(141, 166, 198, 0.18)",
    destructive: "#f87171",
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
