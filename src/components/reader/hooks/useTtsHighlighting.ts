"use client";

import { useEffect, useRef, useCallback } from "react";
import type { Rendition } from "epubjs";

const TTS_HIGHLIGHT_CSS = `
[data-tts-active='1'] {
  position: relative;
}
.tts-sentence-highlight {
  transition: all 0.2s ease;
  border-radius: 3px;
  padding: 1px 2px;
}
[data-tts-immersive] {
  overflow: hidden;
}
[data-tts-immersive] body {
  opacity: 0.3;
  transition: opacity 0.3s ease;
}
`;

/**
 * 在元素内查找文本并创建 Range
 */
function findTextRange(element: Node, searchText: string): Range | null {
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
}

/**
 * Hook for managing TTS highlighting in EPUB rendition
 */
export function useTtsHighlighting(
  renditionRef: React.RefObject<Rendition | null>,
  isRenditionReady: boolean,
  activeTtsParagraph: string | undefined,
  highlightColor: string = "#3b82f6"
) {
  const highlightSpanRef = useRef<HTMLElement | null>(null);
  const normalizeText = useCallback((text: string) => text.replace(/\s+/g, "").trim(), []);

  // Inject TTS highlight CSS
  useEffect(() => {
    const contents = renditionRef.current?.getContents?.() as
      | Array<{ document?: Document }>
      | undefined;
    const doc = contents?.[0]?.document;
    if (!doc) return;

    let styleEl = doc.getElementById("tts-highlight-style");
    if (!styleEl) {
      styleEl = doc.createElement("style");
      styleEl.id = "tts-highlight-style";
      styleEl.textContent = TTS_HIGHLIGHT_CSS;
      doc.head.appendChild(styleEl);
    }
  }, [isRenditionReady, renditionRef]);

  // Handle active sentence highlighting
  useEffect(() => {
    const contents = renditionRef.current?.getContents?.() as
      | Array<{ document?: Document }>
      | undefined;
    const doc = contents?.[0]?.document;
    if (!doc?.body) return;

    // Clear existing highlight
    if (highlightSpanRef.current) {
      const span = highlightSpanRef.current;
      const parent = span.parentNode;
      if (parent) {
        // 将 span 的内容替换为文本节点
        const textContent = span.textContent || "";
        const textNode = doc.createTextNode(textContent);
        parent.replaceChild(textNode, span);
        // 规范化父节点（合并相邻文本节点）
        parent.normalize();
      }
      highlightSpanRef.current = null;
    }

    // Clear paragraph-level highlights
    const activeNodes = doc.body.querySelectorAll("[data-tts-active='1']");
    activeNodes.forEach((node) => {
      node.removeAttribute("data-tts-active");
      const element = node as HTMLElement;
      element.style.cssText = "";
    });

    doc.body.removeAttribute("data-tts-immersive");

    if (!activeTtsParagraph) {
      return;
    }

    const needle = normalizeText(activeTtsParagraph).slice(0, 200);
    if (!needle) return;

    const candidates = doc.body.querySelectorAll(
      "p, li, blockquote, h1, h2, h3, h4, h5, h6"
    );

    for (const candidate of candidates) {
      const text = normalizeText(candidate.textContent || "");
      if (text.includes(needle)) {
        candidate.setAttribute("data-tts-active", "1");

        // 尝试找到精确的句子范围并高亮
        const range = findTextRange(candidate, activeTtsParagraph);
        if (range) {
          try {
            const span = doc.createElement("span");
            span.className = "tts-sentence-highlight";
            span.style.backgroundColor = `${highlightColor}40`;

            range.surroundContents(span);
            highlightSpanRef.current = span;
          } catch {
            // 如果 surroundContents 失败（跨越多个块级元素），回退到段落高亮
            (candidate as HTMLElement).style.backgroundColor = `${highlightColor}20`;
          }
        } else {
          // 找不到精确范围，回退到段落高亮
          (candidate as HTMLElement).style.backgroundColor = `${highlightColor}20`;
        }

        break;
      }
    }
  }, [
    activeTtsParagraph,
    isRenditionReady,
    renditionRef,
    highlightColor,
    normalizeText,
  ]);
}

/**
 * Hook for scroll-to-active functionality
 */
export function useScrollToActive(
  renditionRef: React.RefObject<Rendition | null>,
  isRenditionReady: boolean,
  activeTtsParagraph: string | undefined
) {
  const normalizeText = useCallback((text: string) => text.replace(/\s+/g, "").trim(), []);

  useEffect(() => {
    if (!activeTtsParagraph || !isRenditionReady) return;

    const contents = renditionRef.current?.getContents?.() as
      | Array<{ document?: Document; spine?: { index: number } }>
      | undefined;
    const doc = contents?.[0]?.document;
    const epubContainer = doc?.querySelector?.(".epub-container") || doc?.body?.parentElement;

    if (!doc || !epubContainer) return;

    const needle = normalizeText(activeTtsParagraph).slice(0, 80);
    const candidates = doc.body.querySelectorAll(
      "p, li, blockquote, h1, h2, h3, h4, h5, h6"
    );

    for (const candidate of candidates) {
      const text = normalizeText(candidate.textContent || "");
      if (text.includes(needle)) {
        const element = candidate as HTMLElement;
        const iframe = doc.querySelector("iframe");
        const iframeRect = iframe?.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();

        if (!iframeRect || !elementRect) return;

        const iframeOffsetTop = iframeRect.top;
        const elementOffsetTop = elementRect.top - iframeRect.top;

        const absoluteTop = iframeOffsetTop + elementOffsetTop;
        const targetScrollTop = absoluteTop - epubContainer.clientHeight * 0.25;
        epubContainer.scrollTo({
          top: Math.max(0, targetScrollTop),
          behavior: "smooth",
        });
        break;
      }
    }
  }, [
    activeTtsParagraph,
    isRenditionReady,
    renditionRef,
    normalizeText,
  ]);
}
