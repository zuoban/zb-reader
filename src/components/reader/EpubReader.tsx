"use client";

import {
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useState,
} from "react";
import ePub, { Book, Rendition } from "epubjs";
import { logger } from "@/lib/logger";
import { EpubContext } from "@/lib/epub-context";
import {
  prepareParagraphs,
  buildPositionIndex,
  findVisibleParagraphs,
  ParagraphLayout,
  calculateLineHeight,
} from "@/lib/pretext-layout";

interface EpubReaderProps {
  url: string;
  initialLocation?: string;
  fontSize?: number;
  fontFamily?: string;
  theme?: "light" | "dark" | "sepia";
  onLocationChange?: (location: {
    cfi: string;
    progress: number;
    currentPage?: number;
    totalPages?: number;
    href?: string;
    scrollRatio?: number;
  }) => void;
  onTocLoaded?: (toc: TocItem[]) => void;
  onTextSelected?: (cfiRange: string, text: string) => void;
  onReady?: () => void;
  onClick?: () => void;
  highlights?: Array<{ cfiRange: string; color: string; id: string }>;
  activeTtsParagraph?: string;
  activeTtsParagraphId?: string | null;
  activeTtsLocation?: string | null;
  ttsHighlightColor?: string;
}

export interface ReaderParagraph {
  id: string;
  text: string;
  location?: string;
}

export interface EpubReaderRef {
  goToLocation: (cfi: string) => void;
  goToHref: (href: string) => void;
  goToPercentage: (percentage: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  scrollDown: (amount?: number) => void;
  scrollUp: (amount?: number) => void;
  getCurrentLocation: () => string | null;
  getActiveTtsLocation: () => string | null;
  getProgress: () => number;
  getCurrentText: () => string | null;
  getCurrentParagraphs: () => ReaderParagraph[];
  isFirstVisibleParagraphComplete: () => boolean;
  scrollToActiveParagraph: () => void;
}

export interface TocItem {
  label: string;
  href: string;
  id?: string;
  subitems?: TocItem[];
}

interface RawTocItem {
  label: string;
  href: string;
  id?: string;
  subitems?: RawTocItem[];
}

const FONT_FAMILY_MAP: Record<string, string> = {
  system: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif',
  serif: '"Noto Serif SC", "Source Han Serif SC", "Songti SC", "SimSun", "STSong", serif',
  sans: '"Noto Sans SC", "Source Han Sans SC", "Heiti SC", "SimHei", "STHeiti", sans-serif',
  kaiti: '"LXGW WenKai", "Kaiti SC", "STKaiti", "KaiTi", "BiauKai", serif',
};

const getFontFamily = (fontFamily?: string) => {
  return FONT_FAMILY_MAP[fontFamily || "system"] || FONT_FAMILY_MAP.system;
};

const THEME_STYLES: Record<
  NonNullable<EpubReaderProps["theme"]>,
  Record<string, Record<string, string>>
> = {
  light: {
    html: {
      background: "transparent",
    },
    body: {
      background: "transparent",
      color: "hsl(240 10% 3.9%)",
      "font-family":
        '"Baskerville", "Iowan Old Style", "Palatino Linotype", "Noto Serif SC", "Songti SC", "Source Han Serif SC", "LXGW WenKai", "ZCOOL XiaoWei", serif',
      "line-height": "2.12",
      "letter-spacing": "0.015em",
      "text-rendering": "optimizeLegibility",
      "-webkit-font-smoothing": "antialiased",
      "font-kerning": "normal",
      "word-break": "break-word",
      "overflow-wrap": "break-word",
      "padding-top": "2.8rem",
      "padding-bottom": "5.2rem",
      "padding-left": "1.35rem",
      "padding-right": "1.35rem",
      margin: "0",
      width: "100%",
      display: "flex",
      "flex-direction": "column",
      "align-items": "center",
      "box-sizing": "border-box",
    },
    "body > *": {
      width: "100%",
      "max-width": "100%",
      "margin-left": "auto",
      "margin-right": "auto",
      "box-sizing": "border-box",
    },
    p: {
      margin: "0 0 1.65em",
      "text-align": "justify",
      "text-indent": "2em",
    },
    "h1, h2, h3, h4, h5, h6": {
      color: "hsl(240 10% 3.9%)",
      "font-weight": "600",
      "line-height": "1.45",
      "margin-top": "2.65em",
      "margin-bottom": "1.15em",
      "letter-spacing": "0.032em",
      "text-align": "center",
      "text-wrap": "balance",
    },
    h1: {
      "font-size": "1.78em",
      "line-height": "1.32",
      "margin-top": "0.5em",
      "margin-bottom": "1.35em",
      "font-weight": "700",
    },
    h2: {
      "font-size": "1.32em",
      "margin-top": "3em",
      "margin-bottom": "1.2em",
    },
    h3: {
      "font-size": "1.15em",
      "margin-top": "2.5em",
      "margin-bottom": "1em",
    },
    "ul, ol": {
      margin: "1.45em 0 1.7em",
      padding: "0 0 0 1.8em",
    },
    li: {
      margin: "0.52em 0",
      "padding-left": "0.25em",
      "line-height": "2.02",
    },
    blockquote: {
      margin: "1.85em auto",
      padding: "1.12em 1.35em",
      "border-left": "4px solid rgba(24,24,27,0.18)",
      "border-radius": "1rem",
      background: "rgba(24,24,27,0.035)",
      color: "rgba(24,24,27,0.82)",
      "font-style": "italic",
    },
    hr: {
      width: "6rem",
      height: "1px",
      margin: "3em auto",
      border: "0",
      background:
        "linear-gradient(90deg, transparent 0%, rgba(24,24,27,0.2) 18%, rgba(24,24,27,0.2) 82%, transparent 100%)",
    },
    "pre, code, kbd": {
      "font-family":
        '"SFMono-Regular", "JetBrains Mono", "Fira Code", "Noto Sans Mono SC", "Courier New", monospace',
    },
    pre: {
      margin: "1.75em 0",
      padding: "1.05em 1.2em",
      "border-radius": "1rem",
      background: "rgba(24,24,27,0.05)",
      border: "1px solid rgba(24,24,27,0.1)",
      "font-size": "0.93em",
      "line-height": "1.78",
      overflow: "auto",
      "white-space": "pre-wrap",
    },
    code: {
      "font-size": "0.93em",
      background: "rgba(24,24,27,0.07)",
      "border-radius": "0.5rem",
      padding: "0.15em 0.4em",
    },
    "figure, .figure": {
      margin: "2.2em auto",
      "text-align": "center",
    },
    figcaption: {
      margin: "0.95em auto 0",
      "font-size": "0.89em",
      color: "rgba(24,24,27,0.58)",
      "line-height": "1.72",
    },
    "strong, b": {
      "font-weight": "700",
      color: "rgba(24,24,27,0.94)",
    },
    "em, i": {
      "font-style": "italic",
      color: "rgba(24,24,27,0.85)",
    },
    "img, svg, video, canvas": {
      "max-width": "100%",
      height: "auto",
      "border-radius": "1rem",
      "box-shadow": "0 18px 36px -28px rgba(15,23,42,0.38)",
    },
    "a, a:visited": {
      color: "inherit",
      "text-decoration": "none",
    },
    "a:hover": {
      "text-decoration": "underline",
      "text-decoration-color": "rgba(24,24,27,0.3)",
    },
    table: {
      margin: "1.8em auto",
      "border-collapse": "collapse",
      width: "100%",
      "font-size": "0.95em",
    },
    th: {
      padding: "0.72em 1em",
      "border-bottom": "2px solid rgba(24,24,27,0.12)",
      "font-weight": "600",
      "text-align": "left",
    },
    td: {
      padding: "0.68em 1em",
      "border-bottom": "1px solid rgba(24,24,27,0.08)",
    },
  },
  dark: {
    html: {
      background: "transparent",
    },
    body: {
      background: "transparent",
      color: "hsl(0 0% 98%)",
      "font-family":
        '"Baskerville", "Iowan Old Style", "Palatino Linotype", "Noto Serif SC", "Songti SC", "Source Han Serif SC", "LXGW WenKai", "ZCOOL XiaoWei", serif',
      "line-height": "2.12",
      "letter-spacing": "0.015em",
      "text-rendering": "optimizeLegibility",
      "-webkit-font-smoothing": "antialiased",
      "font-kerning": "normal",
      "word-break": "break-word",
      "overflow-wrap": "break-word",
      "padding-top": "2.8rem",
      "padding-bottom": "5.2rem",
      "padding-left": "1.35rem",
      "padding-right": "1.35rem",
      margin: "0",
      width: "100%",
      display: "flex",
      "flex-direction": "column",
      "align-items": "center",
      "box-sizing": "border-box",
    },
    "body > *": {
      width: "100%",
      "max-width": "100%",
      "margin-left": "auto",
      "margin-right": "auto",
      "box-sizing": "border-box",
    },
    p: {
      margin: "0 0 1.65em",
      "text-align": "justify",
      "text-indent": "2em",
    },
    "h1, h2, h3, h4, h5, h6": {
      color: "hsl(0 0% 98%)",
      "font-weight": "600",
      "line-height": "1.45",
      "margin-top": "2.65em",
      "margin-bottom": "1.15em",
      "letter-spacing": "0.032em",
      "text-align": "center",
      "text-wrap": "balance",
    },
    h1: {
      "font-size": "1.78em",
      "line-height": "1.32",
      "margin-top": "0.5em",
      "margin-bottom": "1.35em",
      "font-weight": "700",
    },
    h2: {
      "font-size": "1.32em",
      "margin-top": "3em",
      "margin-bottom": "1.2em",
    },
    h3: {
      "font-size": "1.15em",
      "margin-top": "2.5em",
      "margin-bottom": "1em",
    },
    "ul, ol": {
      margin: "1.45em 0 1.7em",
      padding: "0 0 0 1.8em",
    },
    li: {
      margin: "0.52em 0",
      "padding-left": "0.25em",
      "line-height": "2.02",
    },
    blockquote: {
      margin: "1.85em auto",
      padding: "1.12em 1.35em",
      "border-left": "4px solid rgba(255,255,255,0.22)",
      "border-radius": "1rem",
      background: "rgba(255,255,255,0.05)",
      color: "rgba(250,250,250,0.82)",
      "font-style": "italic",
    },
    hr: {
      width: "6rem",
      height: "1px",
      margin: "3em auto",
      border: "0",
      background:
        "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.24) 18%, rgba(255,255,255,0.24) 82%, transparent 100%)",
    },
    "pre, code, kbd": {
      "font-family":
        '"SFMono-Regular", "JetBrains Mono", "Fira Code", "Noto Sans Mono SC", "Courier New", monospace',
    },
    pre: {
      margin: "1.75em 0",
      padding: "1.05em 1.2em",
      "border-radius": "1rem",
      background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.1)",
      "font-size": "0.93em",
      "line-height": "1.78",
      overflow: "auto",
      "white-space": "pre-wrap",
    },
    code: {
      "font-size": "0.93em",
      background: "rgba(255,255,255,0.09)",
      "border-radius": "0.5rem",
      padding: "0.15em 0.4em",
    },
    "figure, .figure": {
      margin: "2.2em auto",
      "text-align": "center",
    },
    figcaption: {
      margin: "0.95em auto 0",
      "font-size": "0.89em",
      color: "rgba(250,250,250,0.58)",
      "line-height": "1.72",
    },
    "strong, b": {
      "font-weight": "700",
      color: "rgba(250,250,250,0.96)",
    },
    "em, i": {
      "font-style": "italic",
      color: "rgba(250,250,250,0.85)",
    },
    "img, svg, video, canvas": {
      "max-width": "100%",
      height: "auto",
      "border-radius": "1rem",
      "box-shadow": "0 22px 40px -32px rgba(0,0,0,0.65)",
    },
    "a, a:visited": {
      color: "inherit",
      "text-decoration": "none",
    },
    "a:hover": {
      "text-decoration": "underline",
      "text-decoration-color": "rgba(255,255,255,0.3)",
    },
    table: {
      margin: "1.8em auto",
      "border-collapse": "collapse",
      width: "100%",
      "font-size": "0.95em",
    },
    th: {
      padding: "0.72em 1em",
      "border-bottom": "2px solid rgba(255,255,255,0.15)",
      "font-weight": "600",
      "text-align": "left",
    },
    td: {
      padding: "0.68em 1em",
      "border-bottom": "1px solid rgba(255,255,255,0.1)",
    },
  },
  sepia: {
    html: {
      background: "transparent",
    },
    body: {
      background: "transparent",
      color: "#5B4636",
      "font-family":
        '"Baskerville", "Iowan Old Style", "Palatino Linotype", "Noto Serif SC", "Songti SC", "Source Han Serif SC", "LXGW WenKai", "ZCOOL XiaoWei", serif',
      "line-height": "2.18",
      "letter-spacing": "0.016em",
      "text-rendering": "optimizeLegibility",
      "-webkit-font-smoothing": "antialiased",
      "font-kerning": "normal",
      "word-break": "break-word",
      "overflow-wrap": "break-word",
      "padding-top": "2.95rem",
      "padding-bottom": "5.35rem",
      "padding-left": "1.35rem",
      "padding-right": "1.35rem",
      margin: "0",
      width: "100%",
      display: "flex",
      "flex-direction": "column",
      "align-items": "center",
      "box-sizing": "border-box",
    },
    "body > *": {
      width: "100%",
      "max-width": "100%",
      "margin-left": "auto",
      "margin-right": "auto",
      "box-sizing": "border-box",
    },
    p: {
      margin: "0 0 1.72em",
      "text-align": "justify",
      "text-indent": "2em",
    },
    "h1, h2, h3, h4, h5, h6": {
      color: "#4C382B",
      "font-weight": "600",
      "line-height": "1.48",
      "margin-top": "2.7em",
      "margin-bottom": "1.18em",
      "letter-spacing": "0.033em",
      "text-align": "center",
      "text-wrap": "balance",
    },
    h1: {
      "font-size": "1.82em",
      "line-height": "1.38",
      "margin-top": "0.52em",
      "margin-bottom": "1.38em",
      "font-weight": "700",
    },
    h2: {
      "font-size": "1.35em",
      "margin-top": "3.05em",
      "margin-bottom": "1.25em",
    },
    h3: {
      "font-size": "1.18em",
      "margin-top": "2.55em",
      "margin-bottom": "1.05em",
    },
    "ul, ol": {
      margin: "1.52em 0 1.78em",
      padding: "0 0 0 1.8em",
    },
    li: {
      margin: "0.55em 0",
      "padding-left": "0.25em",
      "line-height": "2.05",
    },
    blockquote: {
      margin: "1.92em auto",
      padding: "1.15em 1.38em",
      "border-left": "4px solid rgba(91,70,54,0.2)",
      "border-radius": "1rem",
      background: "rgba(91,70,54,0.05)",
      color: "rgba(91,70,54,0.85)",
      "font-style": "italic",
    },
    hr: {
      width: "6rem",
      height: "1px",
      margin: "3.05em auto",
      border: "0",
      background:
        "linear-gradient(90deg, transparent 0%, rgba(91,70,54,0.22) 18%, rgba(91,70,54,0.22) 82%, transparent 100%)",
    },
    "pre, code, kbd": {
      "font-family":
        '"SFMono-Regular", "JetBrains Mono", "Fira Code", "Noto Sans Mono SC", "Courier New", monospace',
    },
    pre: {
      margin: "1.8em 0",
      padding: "1.05em 1.2em",
      "border-radius": "1rem",
      background: "rgba(91,70,54,0.07)",
      border: "1px solid rgba(91,70,54,0.1)",
      "font-size": "0.93em",
      "line-height": "1.8",
      overflow: "auto",
      "white-space": "pre-wrap",
    },
    code: {
      "font-size": "0.93em",
      background: "rgba(91,70,54,0.08)",
      "border-radius": "0.5rem",
      padding: "0.15em 0.4em",
    },
    "figure, .figure": {
      margin: "2.25em auto",
      "text-align": "center",
    },
    figcaption: {
      margin: "0.95em auto 0",
      "font-size": "0.89em",
      color: "rgba(91,70,54,0.6)",
      "line-height": "1.75",
    },
    "strong, b": {
      "font-weight": "700",
      color: "rgba(76,56,43,0.97)",
    },
    "em, i": {
      "font-style": "italic",
      color: "rgba(91,70,54,0.85)",
    },
    "img, svg, video, canvas": {
      "max-width": "100%",
      height: "auto",
      "border-radius": "1rem",
      "box-shadow": "0 18px 36px -28px rgba(91,70,54,0.36)",
    },
    "a, a:visited": {
      color: "inherit",
      "text-decoration": "none",
    },
    "a:hover": {
      "text-decoration": "underline",
      "text-decoration-color": "rgba(91,70,54,0.3)",
    },
    table: {
      margin: "1.85em auto",
      "border-collapse": "collapse",
      width: "100%",
      "font-size": "0.95em",
    },
    th: {
      padding: "0.72em 1em",
      "border-bottom": "2px solid rgba(91,70,54,0.15)",
      "font-weight": "600",
      "text-align": "left",
    },
    td: {
      padding: "0.68em 1em",
      "border-bottom": "1px solid rgba(91,70,54,0.1)",
    },
  },
};

const EpubReader = forwardRef<EpubReaderRef, EpubReaderProps>(
  (
    {
      url,
      initialLocation,
      fontSize = 16,
      fontFamily = "system",
      theme = "light",
      onLocationChange,
      onTocLoaded,
      onTextSelected,
      onReady,
      onClick,
      highlights,
      activeTtsParagraph,
      activeTtsParagraphId,
      activeTtsLocation,
      ttsHighlightColor = "#3b82f6",
    },
    ref
  ) => {
    const [pageWidth, setPageWidth] = useState(100);

    useEffect(() => {
      const updatePageWidth = () => {
        const width = window.innerWidth;
        let newWidth = 100;
        if (width >= 1920) {
          newWidth = 60;
        } else if (width >= 1440) {
          newWidth = 70;
        } else if (width >= 1024) {
          newWidth = 80;
        } else if (width >= 768) {
          newWidth = 90;
        } else if (width >= 480) {
          newWidth = 95;
        }
        setPageWidth(newWidth);
      };

      updatePageWidth();
      window.addEventListener("resize", updatePageWidth);
      return () => window.removeEventListener("resize", updatePageWidth);
    }, []);

    const viewerRef = useRef<HTMLDivElement>(null);
    const bookRef = useRef<Book | null>(null);
    const renditionRef = useRef<Rendition | null>(null);
    const currentLocationRef = useRef<string | null>(null);
    const progressRef = useRef<number>(0);
    const scrollRatioRef = useRef<number>(0);
    const highlightIdsRef = useRef<Set<string>>(new Set());
    const [_isReady, setIsReady] = useState(false);
    const [isRenditionReady, setIsRenditionReady] = useState(false);
    const pendingHighlightsRef = useRef<Array<{ cfiRange: string; color: string; id: string }>>([]);
    const justSelectedRef = useRef(false);

    const highlightSpanRef = useRef<HTMLElement | null>(null);
    const epubContextRef = useRef<EpubContext>(new EpubContext());

    const paragraphLayoutsRef = useRef<ParagraphLayout[]>([]);
    const positionIndexRef = useRef<Array<{
      id: string;
      startY: number;
      endY: number;
      height: number;
      index: number;
    }>>([]);
    const layoutContainerWidthRef = useRef<number>(0);

    /**
     * 在元素内查找文本并创建 Range
     */
    const findTextRange = useCallback((element: Node, searchText: string): Range | null => {
      const normalizedSearch = searchText.replace(/\s+/g, "").trim();
      if (!normalizedSearch) return null;

      const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        null
      );

      const textNodes: Text[] = [];
      let node: Node | null;

      while ((node = walker.nextNode())) {
        textNodes.push(node as Text);
      }

      // 收集所有文本内容
      let fullText = "";
      const nodeOffsets: { node: Text; start: number; end: number }[] = [];

      for (const textNode of textNodes) {
        const text = textNode.textContent || "";
        nodeOffsets.push({
          node: textNode,
          start: fullText.length,
          end: fullText.length + text.length,
        });
        fullText += text;
      }

      const normalizedFullText = fullText.replace(/\s+/g, "");

      // 查找匹配位置
      const index = normalizedFullText.indexOf(normalizedSearch);
      if (index === -1) return null;

      // 计算在原始文本中的起始和结束位置
      let charCount = 0;
      let startOffset = -1;
      let endOffset = -1;

      for (let i = 0; i < fullText.length; i++) {
        if (fullText[i].trim()) {
          if (charCount === index && startOffset === -1) {
            startOffset = i;
          }
          if (charCount === index + normalizedSearch.length - 1 && endOffset === -1) {
            endOffset = i + 1;
            break;
          }
          charCount++;
        }
      }

      if (startOffset === -1 || endOffset === -1) return null;

      // 找到对应的节点和偏移
      let startNode: Text | null = null;
      let endNode: Text | null = null;
      let startNodeOffset = 0;
      let endNodeOffset = 0;

      for (const { node, start, end } of nodeOffsets) {
        if (start <= startOffset && startOffset < end) {
          startNode = node;
          startNodeOffset = startOffset - start;
        }
        if (start < endOffset && endOffset <= end) {
          endNode = node;
          endNodeOffset = endOffset - start;
        }
      }

      if (!startNode || !endNode) return null;

      const range = document.createRange();
      range.setStart(startNode, startNodeOffset);
      range.setEnd(endNode, endNodeOffset);

      return range;
    }, []);

    const buildParagraphId = useCallback((index: number, text: string) => {
      const normalized = text
        .toLowerCase()
        .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 24);

      return `reader-p-${index}-${normalized || "text"}`;
    }, []);

    const buildParagraphLayoutIndex = useCallback(
      (
        doc: Document,
        containerWidth: number
      ) => {
        const nodes = doc.body.querySelectorAll(
          "p, li, blockquote, h1, h2, h3, h4, h5, h6"
        );

        const paragraphs: Array<{ id: string; text: string; location?: string }> = [];

        for (const [index, element] of Array.from(nodes).entries()) {
          const text = (element.textContent || "").replace(/\s+/g, " ").trim();
          if (text.length > 0 && text.length <= 800) {
            const id = buildParagraphId(index, text);
            element.setAttribute("data-reader-paragraph-id", id);
            paragraphs.push({
              id,
              text,
              location: epubContextRef.current.getCfiFromNode(element) || undefined,
            });
          }
        }

        if (paragraphs.length === 0) {
          paragraphLayoutsRef.current = [];
          positionIndexRef.current = [];
          return;
        }

        const layouts = prepareParagraphs(paragraphs, {
          fontSize,
          containerWidth,
          lineHeight: calculateLineHeight(fontSize),
        });

        paragraphLayoutsRef.current = layouts;
        positionIndexRef.current = buildPositionIndex(layouts);
        layoutContainerWidthRef.current = containerWidth;
      },
      [fontSize, buildParagraphId]
    );

    const stripScrollSuffix = useCallback((location: string) => {
      const scrollSepIdx = location.indexOf("#scroll=");
      return scrollSepIdx === -1 ? location : location.slice(0, scrollSepIdx);
    }, []);

    const resolveRangeSafely = useCallback(
      async (location: string) => {
        const book = bookRef.current;
        if (!book) return null;

        try {
          return await book.getRange(stripScrollSuffix(location));
        } catch (error) {
          logger.warn("epub-reader", "解析 CFI 失败", { location, error });
          return null;
        }
      },
      [stripScrollSuffix]
    );

    useImperativeHandle(ref, () => ({
      goToLocation(cfi: string) {
        void resolveRangeSafely(cfi).then((range) => {
          if (!range) return;
          renditionRef.current?.display(stripScrollSuffix(cfi));
        });
      },
      goToHref(href: string) {
        renditionRef.current?.display(href);
      },
      goToPercentage(percentage: number) {
        const book = bookRef.current;
        if (!book || !renditionRef.current) return;
        const cfi = book.locations.cfiFromPercentage(percentage);
        if (cfi) {
          renditionRef.current.display(cfi);
        }
      },
      nextPage() {
        const rendition = renditionRef.current;
        if (!rendition) return;
        rendition.next();
      },
      prevPage() {
        const rendition = renditionRef.current;
        if (!rendition) return;
        rendition.prev();
      },
      scrollDown(amount = 300) {
        const container = epubContextRef.current.getScrollContainer();
        container?.scrollBy({ top: amount, behavior: "smooth" });
      },
      scrollUp(amount = 300) {
        const container = epubContextRef.current.getScrollContainer();
        container?.scrollBy({ top: -amount, behavior: "smooth" });
      },
      getCurrentLocation() {
        return currentLocationRef.current;
      },
      getActiveTtsLocation() {
        const activeElement = epubContextRef.current.getActiveTtsElement();
        if (!activeElement) return null;
        return epubContextRef.current.getCfiFromNode(activeElement);
      },
      getProgress() {
        return progressRef.current;
      },
      getCurrentText() {
        const body = epubContextRef.current.getBody();
        const text = body?.innerText?.trim();
        return text && text.length > 0 ? text : null;
      },
      getCurrentParagraphs() {
        const ctx = epubContextRef.current;
        const doc = ctx.getDocument();
        if (!doc?.body) return [];

        const normalizeParagraph = (text: string) => text.replace(/\s+/g, " ").trim();

        const containerScrollTop = ctx.getScrollTop();
        const { height: viewportHeight } = ctx.getViewportSize();

        const positionIndex = positionIndexRef.current;
        const paragraphLayouts = paragraphLayoutsRef.current;

        if (positionIndex.length > 0 && paragraphLayouts.length > 0) {
          const visibleIds = findVisibleParagraphs(
            positionIndex,
            containerScrollTop,
            viewportHeight,
            100
          );

          if (visibleIds.length > 0) {
            const visibleParagraphs: ReaderParagraph[] = [];

            for (const { index } of visibleIds) {
              const layout = paragraphLayouts[index];
              if (layout && layout.text.length > 0) {
                visibleParagraphs.push({
                  id: layout.id,
                  text: layout.text,
                  location: layout.location,
                });
              }
            }

            if (visibleParagraphs.length > 0) {
              return visibleParagraphs;
            }
          }
        }

        const nodes = doc.body.querySelectorAll(
          "p, li, blockquote, h1, h2, h3, h4, h5, h6"
        );

        const elementArray = Array.from(nodes) as HTMLElement[];
        const { width: viewportWidth } = ctx.getViewportSize();

        const visibleTop = containerScrollTop;
        const visibleBottom = containerScrollTop + viewportHeight;

        const isRectVisible = (rect: DOMRect) =>
          rect.bottom > visibleTop &&
          rect.top < visibleBottom &&
          rect.right > 0 &&
          rect.left < viewportWidth;

        const isElementOnCurrentViewport = (element: HTMLElement) => {
          const rects = Array.from(element.getClientRects());

          for (const rect of rects) {
            if (!isRectVisible(rect)) continue;

            const viewportX = Math.min(
              viewportWidth - 1,
              Math.max(1, Math.floor(rect.left + Math.min(rect.width / 2, 24)))
            );
            const viewportY = Math.min(
              viewportHeight - 1,
              Math.max(1, Math.floor(rect.top + Math.min(rect.height / 2, 12)))
            );
            const hit = doc.elementFromPoint(viewportX, viewportY) as HTMLElement | null;
            if (!hit) continue;

            if (element === hit || element.contains(hit)) {
              return true;
            }
          }

          return false;
        };

        const getParagraphLocation = (element: HTMLElement) => {
          const cfi = ctx.getCfiFromNode(element);
          return cfi || undefined;
        };

        const visibleParagraphs: ReaderParagraph[] = [];

        for (const [index, element] of elementArray.entries()) {
          if (isElementOnCurrentViewport(element)) {
            const text = normalizeParagraph(element.textContent || "");
            if (text.length > 0) {
              const id = buildParagraphId(index, text);
              element.setAttribute("data-reader-paragraph-id", id);
              visibleParagraphs.push({
                id,
                text,
                location: getParagraphLocation(element),
              });
            }
          }
        }

        if (visibleParagraphs.length > 0) {
          return visibleParagraphs;
        }

        const pageCenterY = containerScrollTop + viewportHeight / 2;
        const nearestParagraphs = elementArray
          .map((element, index) => {
            const rects = Array.from(element.getClientRects());
            const text = normalizeParagraph(element.textContent || "");
            const id = buildParagraphId(index, text);
            element.setAttribute("data-reader-paragraph-id", id);
            if (rects.length === 0) {
              return { distance: Infinity, id, text, location: getParagraphLocation(element) };
            }
            const minDistance = rects.reduce((best, rect) => {
              const rectCenterY = rect.top + rect.height / 2;
              return Math.min(best, Math.abs(rectCenterY - pageCenterY));
            }, Infinity);
            return {
              distance: minDistance,
              id,
              text,
              location: getParagraphLocation(element),
            };
          })
          .filter((item) => item.text.length > 0 && item.text.length <= 800 && item.distance < viewportHeight)
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 24)
          .map((item) => ({
            id: item.id,
            text: item.text,
            location: item.location,
          }));

        if (nearestParagraphs.length > 0) {
          return nearestParagraphs;
        }

        return [];
      },

      isFirstVisibleParagraphComplete() {
        const ctx = epubContextRef.current;
        const doc = ctx.getDocument();
        if (!doc?.body) return true;

        const nodes = doc.body.querySelectorAll(
          "p, li, blockquote, h1, h2, h3, h4, h5, h6"
        );

        const elementArray = Array.from(nodes) as HTMLElement[];
        const { width: viewportWidth, height: viewportHeight } = ctx.getViewportSize();
        const containerScrollTop = ctx.getScrollTop();

        const visibleTop = containerScrollTop;
        const visibleBottom = containerScrollTop + viewportHeight;

        const isRectVisible = (rect: DOMRect) =>
          rect.bottom > visibleTop &&
          rect.top < visibleBottom &&
          rect.right > 0 &&
          rect.left < viewportWidth;

        const isElementOnCurrentViewport = (element: HTMLElement) => {
          const rects = Array.from(element.getClientRects());

          for (const rect of rects) {
            if (!isRectVisible(rect)) continue;

            const viewportX = Math.min(
              viewportWidth - 1,
              Math.max(1, Math.floor(rect.left + Math.min(rect.width / 2, 24)))
            );
            const viewportY = Math.min(
              viewportHeight - 1,
              Math.max(1, Math.floor(rect.top + Math.min(rect.height / 2, 12)))
            );
            const hit = doc.elementFromPoint(viewportX, viewportY) as HTMLElement | null;
            if (!hit) continue;

            if (element === hit || element.contains(hit)) {
              return true;
            }
          }

          return false;
        };

        for (const element of elementArray) {
          if (isElementOnCurrentViewport(element)) {
            const rects = Array.from(element.getClientRects());
            for (const rect of rects) {
              if (rect.bottom > visibleTop && rect.top < visibleBottom) {
                if (rect.top < visibleTop - 5) {
                  return false;
                }
                return true;
              }
            }
          }
        }

        return true;
      },
      scrollToActiveParagraph() {
        const ctx = epubContextRef.current;
        const activeElement = ctx.getActiveTtsElement();
        if (!activeElement) return;

        ctx.scrollToTop(activeElement);
      },
    }));

    const normalizeText = useCallback((text: string) => {
      return text.replace(/\s+/g, "").trim();
    }, []);

    const findParagraphByPretext = useCallback(
      (
        doc: Document,
        searchText: string
      ): HTMLElement | null => {
        const positionIndex = positionIndexRef.current;
        const paragraphLayouts = paragraphLayoutsRef.current;

        if (positionIndex.length === 0 || paragraphLayouts.length === 0) {
          return null;
        }

        const needle = normalizeText(searchText).slice(0, 80);
        if (!needle) return null;

        let bestLayout: ParagraphLayout | null = null;
        let bestScore = -1;

        for (const layout of paragraphLayouts) {
          const content = normalizeText(layout.text);
          if (!content) continue;

          const minLength = Math.min(48, Math.max(24, Math.floor(needle.length * 0.65)));

          let score = -1;
          if (content === needle) {
            score = 10000;
          } else if (content.includes(needle)) {
            score = 8000 - Math.abs(content.length - needle.length);
          } else if (needle.includes(content) && content.length >= minLength) {
            score = 5000 + content.length;
          }

          if (score > bestScore) {
            bestScore = score;
            bestLayout = layout;
          }
        }

        if (!bestLayout) return null;

        return doc.querySelector(`[data-reader-paragraph-id="${bestLayout.id}"]`) as HTMLElement | null;
      },
      [normalizeText]
    );

    const findTtsElementByLocation = useCallback(
      async (location: string) => {
        const range = await resolveRangeSafely(location);
        const doc = epubContextRef.current.getDocument();
        if (!range || !doc?.body) return null;

        const candidateSelector = "p, li, blockquote, h1, h2, h3, h4, h5, h6";
        const startElement =
          range.startContainer.nodeType === Node.ELEMENT_NODE
            ? (range.startContainer as Element)
            : range.startContainer.parentElement;

        if (!startElement) return null;

        return startElement.closest(candidateSelector) as HTMLElement | null;
      },
      [resolveRangeSafely]
    );

    useEffect(() => {
      const ctx = epubContextRef.current;
      const doc = ctx.getDocument();
      if (!doc?.body) return;

      let cancelled = false;

      const clearCurrentTtsState = () => {
        ctx.clearHighlightSpan();
        ctx.clearTtsHighlight();
        highlightSpanRef.current = null;
      };

      const applyActiveElement = async () => {
        clearCurrentTtsState();

        if (!activeTtsParagraph) {
          return;
        }

        const candidates = ctx.querySelectorAll(
          "p, li, blockquote, h1, h2, h3, h4, h5, h6"
        );

        candidates.forEach((element) => {
          const node = element as HTMLElement;
          node.style.opacity = "";
          node.style.display = "";
        });

        let matchedElement: Element | null = null;

        if (activeTtsParagraphId) {
          matchedElement = ctx.getElementByParagraphId(activeTtsParagraphId);
        }

        if (!matchedElement && activeTtsLocation) {
          matchedElement = await findTtsElementByLocation(activeTtsLocation);
        }

        if (!matchedElement) {
          matchedElement = findParagraphByPretext(doc, activeTtsParagraph);
        }

        if (!matchedElement) {
          const needle = normalizeText(activeTtsParagraph).slice(0, 80);
          if (!needle) return;

          const getCommonPrefixLength = (a: string, b: string) => {
            const limit = Math.min(a.length, b.length);
            let count = 0;
            while (count < limit && a[count] === b[count]) {
              count += 1;
            }
            return count;
          };

          let bestScore = -1;

          for (const element of Array.from(candidates)) {
            const content = normalizeText(element.textContent || "");
            if (!content) continue;

            const tag = element.tagName.toLowerCase();
            const isHeading = /^h[1-6]$/.test(tag);
            const minContainedLength = Math.min(
              48,
              Math.max(24, Math.floor(needle.length * 0.65))
            );

            let score = -1;
            if (content === needle) {
              score = 10000;
            } else if (content.includes(needle)) {
              score = 8000 - Math.abs(content.length - needle.length);
            } else if (needle.includes(content) && content.length >= minContainedLength) {
              score = 5000 + content.length;
            } else {
              const commonPrefixLength = getCommonPrefixLength(content, needle);
              const requiredPrefix = Math.min(30, Math.floor(needle.length * 0.5));
              if (commonPrefixLength >= requiredPrefix && content.length >= 24) {
                score = 4200 + commonPrefixLength;
              }
            }

            if (score < 0) continue;

            if (isHeading && score < 10000) {
              score -= 2500;
            }

            if (score > bestScore) {
              bestScore = score;
              matchedElement = element;
            }
          }
        }

        if (cancelled || !matchedElement) return;

        const activeElement = matchedElement as HTMLElement;
        activeElement.setAttribute("data-tts-active", "1");

        const range = findTextRange(activeElement, activeTtsParagraph);
        if (range) {
          const span = ctx.createHighlightSpan(range, ttsHighlightColor);
          if (span) {
            highlightSpanRef.current = span;
          }
        } else {
          activeElement.style.backgroundColor = `${ttsHighlightColor}20`;
          activeElement.style.borderRadius = "4px";
        }
      };

      void applyActiveElement();

      return () => {
        cancelled = true;
      };
    }, [
      activeTtsParagraphId,
      activeTtsLocation,
      activeTtsParagraph,
      findTtsElementByLocation,
      findTextRange,
      normalizeText,
      findParagraphByPretext,
      theme,
      ttsHighlightColor,
    ]);

    useEffect(() => {
      if (!activeTtsParagraph) return;

      const ctx = epubContextRef.current;
      const activeElement = ctx.getActiveTtsElement();
      if (!activeElement) return;

      ctx.scrollToElement(activeElement, 0.25);
    }, [activeTtsParagraph]);

    useEffect(() => {
      if (!viewerRef.current) return;

      let cancelled = false;
      let book: Book | null = null;

      const applyTransparentShell = () => {
        if (!viewerRef.current) return;

        viewerRef.current.style.background = "transparent";

        const epubContainer = viewerRef.current.querySelector(".epub-container") as HTMLElement | null;
        if (epubContainer) {
          epubContainer.style.background = "transparent";
          epubContainer.style.boxShadow = "none";
        }

        const iframeEl = viewerRef.current.querySelector("iframe") as HTMLIFrameElement | null;
        if (iframeEl) {
          iframeEl.style.background = "transparent";
          iframeEl.style.boxShadow = "none";
        }
      };

      async function init() {
        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error("Failed to fetch EPUB file");
          const arrayBuffer = await response.arrayBuffer();

          if (cancelled || !viewerRef.current) return;

          book = ePub(arrayBuffer);
          bookRef.current = book;

          book.spine.hooks.serialize.register(
            (output: string, section: { output: string }) => {
              section.output = output.replace(
                /url\s*\(\s*["']?file:\/\/[^)"']+["']?\s*\)/gi,
                'url("data:application/x-empty,")'
              );
            }
          );

          const rendition = book.renderTo(viewerRef.current, {
            width: "100%",
            height: "100%",
            spread: "none",
            flow: "scrolled-doc",
            allowScriptedContent: true,
          });
          renditionRef.current = rendition;
          epubContextRef.current.setRendition(rendition);
          epubContextRef.current.setContainer(viewerRef.current);
          applyTransparentShell();

          Object.entries(THEME_STYLES).forEach(([name, styles]) => {
            rendition.themes.register(name, styles);
          });

          rendition.themes.select(theme);
          rendition.themes.override("font-size", `${fontSize}px`);
          rendition.themes.override("font-family", getFontFamily(fontFamily));

          let displayCfi: string | undefined;
          let initialScrollRatio: number | null = null;
          if (initialLocation) {
            const scrollSepIdx = initialLocation.indexOf("#scroll=");
            if (scrollSepIdx !== -1) {
              displayCfi = initialLocation.slice(0, scrollSepIdx);
              const ratioStr = initialLocation.slice(scrollSepIdx + 8);
              const parsed = parseFloat(ratioStr);
              if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 1) {
                initialScrollRatio = parsed;
              }
            } else {
              displayCfi = initialLocation;
            }
          }
          await book.ready;

          if (cancelled) return;

          rendition.display(displayCfi || undefined);

          rendition.once("displayed", () => {
            applyTransparentShell();
            setIsRenditionReady(true);
            if (initialScrollRatio !== null) {
              setTimeout(() => {
                const epubContainer = viewerRef.current?.querySelector(".epub-container") as HTMLElement | null;
                if (epubContainer) {
                  const scrollRange = epubContainer.scrollHeight - epubContainer.clientHeight;
                  if (scrollRange > 0) {
                    epubContainer.scrollTop = Math.round(initialScrollRatio! * scrollRange);
                  }
                }
              }, 120);
            }
          });

          rendition.on(
            "relocated",
            (location: {
              start: {
                cfi: string;
                percentage: number;
                displayed: { page: number; total: number };
                href: string;
              };
              end?: {
                cfi: string;
                href: string;
              };
            }) => {
              const cfi = location.start.cfi;
              const href = location.start.href;
              
              const book = bookRef.current;
              let overallProgress = 0;
              
              if (book && book.spine && href) {
                const spineItems = (book.spine as unknown as { items: Array<{ href: string; index: number }> }).items || [];
                const totalSpineItems = spineItems.length;
                
                if (totalSpineItems > 0) {
                  const currentItem = spineItems.find((item) => item.href === href);
                  if (currentItem) {
                    const currentIndex = currentItem.index;
                    
                    const epubContainer = viewerRef.current?.querySelector(".epub-container") as HTMLElement | null;
                    let chapterProgress = 0;
                    if (epubContainer) {
                      const scrollRange = epubContainer.scrollHeight - epubContainer.clientHeight;
                      if (scrollRange > 0) {
                        chapterProgress = Math.min(1, Math.max(0, epubContainer.scrollTop / scrollRange));
                      }
                    }
                    
                    overallProgress = (currentIndex + chapterProgress) / totalSpineItems;
                  }
                }
              }
              
              const clampedProgress = Math.min(1, Math.max(0, overallProgress));
              
              currentLocationRef.current = cfi;
              progressRef.current = clampedProgress;

              let scrollRatio: number | undefined;
              const epubContainer = viewerRef.current?.querySelector(".epub-container") as HTMLElement | null;
              if (epubContainer) {
                const scrollRange = epubContainer.scrollHeight - epubContainer.clientHeight;
                if (scrollRange > 0) {
                  scrollRatio = Math.min(1, Math.max(0, epubContainer.scrollTop / scrollRange));
                  scrollRatioRef.current = scrollRatio;
                }
              }

              onLocationChange?.({
                cfi,
                progress: clampedProgress,
                currentPage: location.start.displayed?.page,
                totalPages: location.start.displayed?.total,
                href,
                scrollRatio,
              });
            }
          );

          rendition.on(
            "selected",
            (cfiRange: string, contents: { window: Window }) => {
              if (!onTextSelected) return;
              const selectionText = contents.window.getSelection()?.toString().trim() || "";

              if (selectionText.length > 0) {
                onTextSelected(cfiRange, selectionText);
                return;
              }

              book!.getRange(cfiRange)
                .then((range: Range) => {
                  const text = range.toString().trim();
                  if (text.length > 0) {
                    onTextSelected(cfiRange, text);
                  }
                })
                .catch((error) => {
                  logger.warn("epub-reader", "解析选中文本范围失败", error);
                });
            }
           );

          rendition.on("click", () => {
            if (justSelectedRef.current) {
              justSelectedRef.current = false;
              return;
            }
            onClick?.();
          });

          book.loaded.navigation.then((nav) => {
            function parseTocItems(items: RawTocItem[]): TocItem[] {
              return items.map((item) => ({
                label: item.label.trim(),
                href: item.href,
                id: item.id || undefined,
                ...(item.subitems && item.subitems.length > 0
                  ? { subitems: parseTocItems(item.subitems) }
                  : {}),
              }));
            }
            onTocLoaded?.(parseTocItems(nav.toc as RawTocItem[]));
          });

          book.ready.then(() => {
            book!.locations.generate(1024).then(() => {
              setIsReady(true);
              onReady?.();
            });
          });
        } catch (error) {
          logger.error("epub-reader", "加载EPUB失败", error);
        }
      }

      init();

      return () => {
        cancelled = true;
        setIsReady(false);
        setIsRenditionReady(false);
        highlightIdsRef.current.clear();
        highlightMapRef.current.clear();
        pendingHighlightsRef.current = [];
        renditionRef.current = null;
        bookRef.current = null;
        if (book) book.destroy();
      };
    }, [url, initialLocation]);

    useEffect(() => {
      const rendition = renditionRef.current;
      if (!rendition) return;
      
      const themeStyle = THEME_STYLES[theme];
      
      rendition.themes.override("background", themeStyle.body.background);
      rendition.themes.override("color", themeStyle.body.color);
    }, [theme]);

    useEffect(() => {
      const rendition = renditionRef.current;
      if (!rendition) return;
      rendition.themes.override("font-size", `${fontSize}px`);

      const doc = epubContextRef.current.getDocument();
      const { width: containerWidth } = epubContextRef.current.getViewportSize();
      if (doc?.body) {
        buildParagraphLayoutIndex(doc, containerWidth);
      }
    }, [fontSize, buildParagraphLayoutIndex]);

    useEffect(() => {
      const rendition = renditionRef.current;
      if (!rendition) return;
      rendition.themes.override("font-family", getFontFamily(fontFamily));
    }, [fontFamily]);

    useEffect(() => {
      if (!isRenditionReady) return;

      epubContextRef.current.applyMaxWidthToChildren(pageWidth);
    }, [pageWidth, isRenditionReady]);

    const highlightMapRef = useRef<Map<string, string>>(new Map());

    const applyHighlights = useCallback(async () => {
      const rendition = renditionRef.current;
      if (!rendition || !isRenditionReady) return;

      const currentHighlights = pendingHighlightsRef.current;

      highlightMapRef.current.forEach((cfiRange, _id) => {
        try {
          rendition.annotations.remove(cfiRange, "highlight");
        } catch {
        }
      });
      highlightMapRef.current.clear();
      highlightIdsRef.current.clear();

      if (!currentHighlights || currentHighlights.length === 0) return;

      for (const h of currentHighlights) {
        const range = await resolveRangeSafely(h.cfiRange);
        if (!range) {
          continue;
        }

        try {
          rendition.annotations.highlight(
            h.cfiRange,
            { id: h.id },
            undefined,
            undefined,
            { fill: h.color, "fill-opacity": "0.3" }
          );
          highlightIdsRef.current.add(h.id);
          highlightMapRef.current.set(h.id, h.cfiRange);
        } catch {
        }
      }
    }, [isRenditionReady, resolveRangeSafely]);

    useEffect(() => {
      pendingHighlightsRef.current = highlights || [];
      void applyHighlights();
    }, [highlights, applyHighlights]);

    useEffect(() => {
      if (isRenditionReady) {
        void applyHighlights();
      }
    }, [isRenditionReady, applyHighlights]);

    useEffect(() => {
      const rendition = renditionRef.current;
      if (!rendition) return;

      const handleDisplayed = () => {
        epubContextRef.current.applyTransparentBackground();

        const doc = epubContextRef.current.getDocument();
        const { width: containerWidth } = epubContextRef.current.getViewportSize();
        if (doc?.body) {
          epubContextRef.current.applyMaxWidthToChildren(pageWidth);
          buildParagraphLayoutIndex(doc, containerWidth);
        }

        void applyHighlights();
      };

      rendition.on("displayed", handleDisplayed);

      return () => {
        rendition.off("displayed", handleDisplayed);
      };
    }, [applyHighlights, pageWidth, buildParagraphLayoutIndex]);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const container = epubContextRef.current.getScrollContainer();
      if (!container) return;

      if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        container.scrollBy({ top: -100, behavior: "smooth" });
      } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        container.scrollBy({ top: 100, behavior: "smooth" });
      }
    }, []);

    useEffect(() => {
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
      };
    }, [handleKeyDown]);

    useEffect(() => {
      const rendition = renditionRef.current;
      if (!rendition || !isRenditionReady) return;

      const onKeyDown = (e: KeyboardEvent) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
          return;
        }

        const container = epubContextRef.current.getScrollContainer();
        if (!container) return;

        if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
          container.scrollBy({ top: -100, behavior: "smooth" });
        } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
          container.scrollBy({ top: 100, behavior: "smooth" });
        }
      };

      rendition.on("keydown", onKeyDown);

      return () => {
        rendition.off("keydown", onKeyDown);
      };
    }, [isRenditionReady]);

          useEffect(() => {
            if (!isRenditionReady) return;
            const epubContainer = viewerRef.current?.querySelector(".epub-container") as HTMLElement | null;
            if (!epubContainer) return;

            let scrollTimer: ReturnType<typeof setTimeout> | null = null;

            const handleScroll = () => {
              const scrollRange = epubContainer.scrollHeight - epubContainer.clientHeight;
              let ratio: number | undefined;
              if (scrollRange > 0) {
                ratio = Math.min(1, Math.max(0, epubContainer.scrollTop / scrollRange));
                scrollRatioRef.current = ratio;
              }

              if (scrollTimer !== null) clearTimeout(scrollTimer);
              scrollTimer = setTimeout(() => {
                scrollTimer = null;
                if (!currentLocationRef.current) return;
                const scrollRange2 = epubContainer.scrollHeight - epubContainer.clientHeight;
                let ratio2: number | undefined;
                if (scrollRange2 > 0) {
                  ratio2 = Math.min(1, Math.max(0, epubContainer.scrollTop / scrollRange2));
                  scrollRatioRef.current = ratio2;
                }
                onLocationChange?.({
                  cfi: currentLocationRef.current,
                  progress: progressRef.current,
                  scrollRatio: ratio2,
                  href: undefined,
                });
              }, 300);
            };

            epubContainer.addEventListener("scroll", handleScroll, { passive: true });

            return () => {
              epubContainer.removeEventListener("scroll", handleScroll);
              if (scrollTimer !== null) clearTimeout(scrollTimer);
            };
          }, [isRenditionReady, onLocationChange]);

    return (
      <div className="relative flex h-full w-full justify-center px-2 sm:px-4 lg:px-6 xl:px-8">
        <div
          ref={viewerRef}
          id="epub-viewer"
          className="h-full flex-none rounded-[24px]"
          style={{ width: `${pageWidth}%` }}
        />
      </div>
    );
  }
);

EpubReader.displayName = "EpubReader";

export default EpubReader;
