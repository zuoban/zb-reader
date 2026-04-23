const FONT_FAMILY_MAP: Record<string, string> = {
  system:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif',
  serif:
    '"Noto Serif SC", "Source Han Serif SC", "Songti SC", "SimSun", "STSong", serif',
  sans:
    '"Noto Sans SC", "Source Han Sans SC", "Heiti SC", "SimHei", "STHeiti", sans-serif',
  kaiti: '"LXGW WenKai", "Kaiti SC", "STKaiti", "KaiTi", "BiauKai", serif',
};

export function getEpubFontFamily(fontFamily?: string) {
  return FONT_FAMILY_MAP[fontFamily || "system"] || FONT_FAMILY_MAP.system;
}
