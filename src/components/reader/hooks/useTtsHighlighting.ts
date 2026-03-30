"use client";

import { useEffect, useRef, useCallback } from "react";
import type { Rendition } from "epubjs";

const TTS_INDICATOR_CSS = `
[data-tts-active='1'] {
  position: relative;
}
[data-tts-active='1'] .tts-progress-track {
  position: absolute;
  left: -10px;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--tts-indicator-color, #3b82f6);
  border-radius: 2px;
}
[data-tts-active='1'] .tts-progress-fill {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 0%;
  background: var(--tts-indicator-color, #3b82f6);
  opacity: 0.3;
  border-radius: 2px;
  transition: width 0.1s ease-out;
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
 * Hook for managing TTS highlighting in EPUB rendition
 */
export function useTtsHighlighting(
  renditionRef: React.RefObject<Rendition | null>,
  isRenditionReady: boolean,
  activeTtsParagraph: string | undefined,
  highlightStyle: "background" | "indicator" = "indicator",
  highlightColor: string = "#3b82f6"
) {
  const highlightIdsRef = useRef<Set<string>>(new Set());
  const normalizeText = useCallback((text: string) => text.replace(/\s+/g, "").trim(), []);

  // Inject TTS indicator CSS
  useEffect(() => {
    const contents = renditionRef.current?.getContents?.() as
      | Array<{ document?: Document }>
      | undefined;
    const doc = contents?.[0]?.document;
    if (!doc) return;

    let styleEl = doc.getElementById("tts-indicator-style");
    if (!styleEl) {
      styleEl = doc.createElement("style");
      styleEl.id = "tts-indicator-style";
      styleEl.textContent = TTS_INDICATOR_CSS;
      doc.head.appendChild(styleEl);
    }
  }, [isRenditionReady, renditionRef]);

  // Handle active paragraph highlighting
  useEffect(() => {
    const contents = renditionRef.current?.getContents?.() as
      | Array<{ document?: Document }>
      | undefined;
    const doc = contents?.[0]?.document;
    if (!doc?.body) return;

    // Clear existing highlights
    const activeNodes = doc.body.querySelectorAll("[data-tts-active='1']");
    activeNodes.forEach((node) => {
      node.removeAttribute("data-tts-active");
      const element = node as HTMLElement;
      element.style.backgroundColor = "";
      element.style.transition = "";
      element.style.opacity = "";
      element.style.display = "";
      element.style.padding = "";
      element.style.border = "";
      element.style.borderRadius = "";
      element.style.boxShadow = "";
      element.style.maxWidth = "";
      element.style.width = "";
      element.style.fontSize = "";
      element.style.lineHeight = "";
      element.style.margin = "";
      element.style.position = "";
      element.style.removeProperty("--tts-indicator-color");
      element.style.backgroundImage = "";
      element.style.backgroundPosition = "";
      element.style.backgroundSize = "";
      element.style.backgroundRepeat = "";
      element.style.paddingBottom = "";
      element.style.marginLeft = "";
      element.style.marginRight = "";
      element.style.background = "";
      element.style.color = "";

      const progressTrack = element.querySelector(".tts-progress-track");
      const progressFill = element.querySelector(".tts-progress-fill");
      if (progressTrack) progressTrack.remove();
      if (progressFill) progressFill.remove();
    });

    doc.body.removeAttribute("data-tts-immersive");

    if (!activeTtsParagraph) {
      return;
    }

    const needle = normalizeText(activeTtsParagraph).slice(0, 80);
    if (!needle) return;

    const candidates = doc.body.querySelectorAll(
      "p, li, blockquote, h1, h2, h3, h4, h5, h6"
    );

    for (const candidate of candidates) {
      const text = normalizeText(candidate.textContent || "");
      if (text.includes(needle) || needle.includes(text.slice(0, 100))) {
        candidate.setAttribute("data-tts-active", "1");

        if (highlightStyle === "indicator") {
          const element = candidate as HTMLElement;
          element.style.setProperty("--tts-indicator-color", highlightColor);

          const progressTrack = doc.createElement("div");
          progressTrack.className = "tts-progress-track";
          candidate.appendChild(progressTrack);

          const progressFill = doc.createElement("div");
          progressFill.className = "tts-progress-fill";
          candidate.appendChild(progressFill);
        } else {
          (candidate as HTMLElement).style.backgroundColor = highlightColor + "40";
        }

        highlightIdsRef.current.add(candidate.getAttribute("data-highlight-id") || "");
        break;
      }
    }
  }, [
    activeTtsParagraph,
    isRenditionReady,
    renditionRef,
    highlightStyle,
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
      if (text.includes(needle) || needle.includes(text.slice(0, 100))) {
        const element = candidate as HTMLElement;
        const iframe = doc.querySelector("iframe");
        const iframeRect = iframe?.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();

        if (!iframeRect || !elementRect) return;

        const iframeOffsetTop = iframeRect.top;
        const elementOffsetTop = elementRect.top - iframeOffsetTop;

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
