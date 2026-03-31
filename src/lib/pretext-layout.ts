import {
  prepare,
  prepareWithSegments,
  layout,
  layoutWithLines,
  walkLineRanges,
} from "@chenglou/pretext";
import type {
  PreparedTextWithSegments,
  LayoutCursor,
} from "@chenglou/pretext";

export interface ParagraphLayout {
  id: string;
  text: string;
  location?: string;
  startIndex: number;
  height: number;
  lineCount: number;
  prepared: PreparedTextWithSegments;
}

export interface SentencePosition {
  text: string;
  startLine: number;
  endLine: number;
  startCursor: LayoutCursor;
  endCursor: LayoutCursor;
  width: number;
}

export interface VisibleRange {
  startIndex: number;
  endIndex: number;
  scrollTop: number;
  viewportHeight: number;
}

const DEFAULT_FONT_FAMILY =
  '"Baskerville", "Iowan Old Style", "Palatino Linotype", "Noto Serif SC", "Songti SC", "Source Han Serif SC", serif';
const DEFAULT_LINE_HEIGHT_MULTIPLIER = 2.08;
const DEFAULT_PADDING_TOP = 2.35 * 16;

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

export function getTotalHeight(layouts: ParagraphLayout[]): number {
  return layouts.reduce((sum, p) => sum + p.height, 0);
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

  let currentY = DEFAULT_PADDING_TOP;

  for (const layout of layouts) {
    index.push({
      id: layout.id,
      startY: currentY,
      endY: currentY + layout.height,
      height: layout.height,
      index: layout.startIndex,
    });
    currentY += layout.height;
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

export interface FindSentencePositionOptions {
  prepared: PreparedTextWithSegments;
  containerWidth: number;
  lineHeight: number;
  searchText: string;
}

export function findSentencePosition(
  options: FindSentencePositionOptions
): SentencePosition | null {
  const { prepared, containerWidth, lineHeight, searchText } = options;

  const normalizedSearch = searchText.replace(/\s+/g, "").trim();
  if (!normalizedSearch) return null;

  let bestMatch: SentencePosition | null = null;

  try {
    walkLineRanges(prepared, containerWidth, (line) => {
      const lineText = getLineText(prepared, line.start, line.end);
      const normalizedLine = lineText.replace(/\s+/g, "").trim();

      if (normalizedLine === normalizedSearch) {
        bestMatch = {
          text: lineText,
          startLine: 0,
          endLine: 0,
          startCursor: line.start,
          endCursor: line.end,
          width: line.width,
        };
      }
    });

    if (bestMatch) return bestMatch;

    const { lines } = layoutWithLines(prepared, containerWidth, lineHeight);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const normalizedLine = line.text.replace(/\s+/g, "").trim();

      if (normalizedLine.includes(normalizedSearch)) {
        const searchIndex = line.text.indexOf(searchText);
        if (searchIndex >= 0) {
          return {
            text: searchText,
            startLine: i,
            endLine: i,
            startCursor: line.start,
            endCursor: line.end,
            width: line.width,
          };
        }
      }
    }
  } catch {
    return null;
  }

  return null;
}

function getLineText(
  prepared: PreparedTextWithSegments,
  start: LayoutCursor,
  _end: LayoutCursor
): string {
  const linesResult = layoutWithLines(prepared, 1000, 24);
  for (const line of linesResult.lines) {
    if (
      line.start.segmentIndex === start.segmentIndex &&
      line.start.graphemeIndex === start.graphemeIndex
    ) {
      return line.text;
    }
  }
  return "";
}

export function estimateParagraphHeight(
  text: string,
  fontSize: number,
  containerWidth: number,
  fontFamily?: string
): number {
  const font = buildFontString(fontSize, fontFamily);
  const lh = calculateLineHeight(fontSize);

  try {
    const prepared = prepare(text, font);
    const { height } = layout(prepared, containerWidth, lh);
    return height;
  } catch {
    return Math.ceil(text.length / 50) * lh;
  }
}

export function measureTextWidth(
  text: string,
  fontSize: number,
  fontFamily?: string
): number {
  const font = buildFontString(fontSize, fontFamily);

  try {
    const prepared = prepareWithSegments(text, font);
    let maxWidth = 0;

    walkLineRanges(prepared, 10000, (line) => {
      if (line.width > maxWidth) {
        maxWidth = line.width;
      }
    });

    return maxWidth;
  } catch {
    return text.length * fontSize * 0.5;
  }
}

export function predictScrollPosition(
  positionIndex: Array<{
    id: string;
    startY: number;
    endY: number;
    height: number;
    index: number;
  }>,
  targetParagraphId: string,
  viewportHeight: number,
  align: "top" | "center" | "bottom" = "center"
): number {
  const target = positionIndex.find((p) => p.id === targetParagraphId);
  if (!target) return 0;

  switch (align) {
    case "top":
      return target.startY;
    case "center":
      return target.startY + target.height / 2 - viewportHeight / 2;
    case "bottom":
      return target.endY - viewportHeight;
    default:
      return target.startY;
  }
}

export function clearPretextCache(): void {
  // Pretext cache is managed internally by the library
  // No manual clearing needed in current implementation
}

export function computeLayoutForTtsHighlight(
  paragraphText: string,
  sentenceText: string,
  fontSize: number,
  containerWidth: number
): {
  sentenceY: number;
  sentenceHeight: number;
  sentenceWidth: number;
  lineIndex: number;
} | null {
  const font = buildFontString(fontSize);
  const lh = calculateLineHeight(fontSize);

  try {
    const prepared = prepareWithSegments(paragraphText, font);
    const { lines } = layoutWithLines(prepared, containerWidth, lh);

    const normalizedSentence = sentenceText.replace(/\s+/g, "").trim();
    if (!normalizedSentence) return null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const normalizedLine = line.text.replace(/\s+/g, "").trim();

      if (normalizedLine.includes(normalizedSentence) || normalizedSentence.includes(normalizedLine)) {
        const yPosition = i * lh;
        return {
          sentenceY: yPosition,
          sentenceHeight: lh,
          sentenceWidth: line.width,
          lineIndex: i,
        };
      }
    }

    return null;
  } catch {
    return null;
  }
}