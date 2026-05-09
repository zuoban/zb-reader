import { prepareWithSegments, layout } from "@chenglou/pretext";
import type { PreparedTextWithSegments } from "@chenglou/pretext";

export interface ParagraphLayout {
  id: string;
  text: string;
  location?: string;
  startIndex: number;
  height: number;
  lineCount: number;
  prepared: PreparedTextWithSegments;
}

export interface VisibleRange {
  startIndex: number;
  endIndex: number;
  scrollTop: number;
  viewportHeight: number;
}

const DEFAULT_FONT_FAMILY =
  '"Baskerville", "Iowan Old Style", "Palatino Linotype", "Noto Serif SC", "Songti SC", "Source Han Serif SC", serif';
const DEFAULT_LINE_HEIGHT_MULTIPLIER = 1.78;

export function buildFontString(fontSize: number, fontFamily?: string): string {
  const family = fontFamily || DEFAULT_FONT_FAMILY;
  return `${fontSize}px ${family}`;
}

export function calculateLineHeight(fontSize: number): number {
  return Math.round(fontSize * DEFAULT_LINE_HEIGHT_MULTIPLIER);
}

export interface PrepareParagraphsOptions {
  fontSize: number;
  fontFamily?: string;
  containerWidth: number;
  lineHeight?: number;
}

export function prepareParagraphs(
  paragraphs: Array<{ id: string; text: string; location?: string }>,
  options: PrepareParagraphsOptions
): ParagraphLayout[] {
  const { fontSize, fontFamily, containerWidth, lineHeight } = options;
  const font = buildFontString(fontSize, fontFamily);
  const lh = lineHeight || calculateLineHeight(fontSize);

  const layouts: ParagraphLayout[] = [];
  let currentIndex = 0;

  for (const paragraph of paragraphs) {
    const trimmedText = paragraph.text.trim();
    if (!trimmedText) continue;

    try {
      const prepared = prepareWithSegments(trimmedText, font);
      const { height, lineCount } = layout(prepared, containerWidth, lh);

      layouts.push({
        id: paragraph.id,
        text: trimmedText,
        location: paragraph.location,
        startIndex: currentIndex,
        height,
        lineCount,
        prepared,
      });

      currentIndex += 1;
    } catch {
      continue;
    }
  }

  return layouts;
}

export function buildPositionIndex(layouts: ParagraphLayout[]): Array<{
  id: string;
  startY: number;
  endY: number;
  height: number;
  index: number;
}> {
  const index: Array<{
    id: string;
    startY: number;
    endY: number;
    height: number;
    index: number;
  }> = [];

  let currentY = 0;

  for (const layoutItem of layouts) {
    index.push({
      id: layoutItem.id,
      startY: currentY,
      endY: currentY + layoutItem.height,
      height: layoutItem.height,
      index: layoutItem.startIndex,
    });
    currentY += layoutItem.height;
  }

  return index;
}

export function findVisibleParagraphs(
  positionIndex: Array<{
    id: string;
    startY: number;
    endY: number;
    height: number;
    index: number;
  }>,
  scrollTop: number,
  viewportHeight: number,
  margin = 50
): Array<{ id: string; index: number; visibilityRatio: number }> {
  const visibleTop = scrollTop - margin;
  const visibleBottom = scrollTop + viewportHeight + margin;

  const result: Array<{ id: string; index: number; visibilityRatio: number }> = [];

  for (const pos of positionIndex) {
    if (pos.endY <= visibleTop || pos.startY >= visibleBottom) continue;

    const overlapTop = Math.max(pos.startY, visibleTop);
    const overlapBottom = Math.min(pos.endY, visibleBottom);
    const overlapHeight = overlapBottom - overlapTop;
    const visibilityRatio = overlapHeight / pos.height;

    if (visibilityRatio > 0) {
      result.push({
        id: pos.id,
        index: pos.index,
        visibilityRatio,
      });
    }
  }

  return result;
}
