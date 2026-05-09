"use client";

import { useEffect } from "react";
import type { MutableRefObject } from "react";
import type { Rendition } from "epubjs";
import { EpubContext } from "@/lib/epub-context";
import { highlightEpubCodeBlocks } from "@/components/reader/epub-code-highlight";

interface EpubContents {
  document?: Document;
}

interface RenditionContentHookAccess {
  hooks?: {
    content?: {
      deregister?: (callback: (contents: EpubContents) => void) => void;
      register?: (callback: (contents: EpubContents) => void) => void;
    };
  };
}

interface UseEpubDisplayedLifecycleParams {
  applyHighlights: () => Promise<void>;
  buildParagraphLayoutIndex: (doc: Document, containerWidth: number) => void;
  currentLocationRef: MutableRefObject<string | null>;
  epubContextRef: MutableRefObject<EpubContext>;
  isRenditionReady: boolean;
  lastLayoutCfiRef: MutableRefObject<string | null>;
  pageWidth: number;
  renditionRef: MutableRefObject<Rendition | null>;
}

export function useEpubDisplayedLifecycle({
  applyHighlights,
  buildParagraphLayoutIndex,
  currentLocationRef,
  epubContextRef,
  isRenditionReady,
  lastLayoutCfiRef,
  pageWidth,
  renditionRef,
}: UseEpubDisplayedLifecycleParams) {
  useEffect(() => {
    if (!isRenditionReady) return;

    const rendition = renditionRef.current;
    if (!rendition) return;
    const timers = new Set<ReturnType<typeof setTimeout>>();

    const runDisplayedWork = () => {
      epubContextRef.current.applyTransparentBackground();

      const doc = epubContextRef.current.getDocument();
      const { width: containerWidth } = epubContextRef.current.getViewportSize();
      if (doc?.body) {
        highlightEpubCodeBlocks(doc);
        epubContextRef.current.applyMaxWidthToChildren(pageWidth);
        buildParagraphLayoutIndex(doc, containerWidth);
        lastLayoutCfiRef.current = currentLocationRef.current;
      }

      void applyHighlights();
    };

    const scheduleDisplayedWork = () => {
      runDisplayedWork();

      for (const delay of [60, 220]) {
        const timer = setTimeout(() => {
          timers.delete(timer);
          runDisplayedWork();
        }, delay);
        timers.add(timer);
      }
    };

    const handleContent = (contents: EpubContents) => {
      if (contents.document?.body) {
        highlightEpubCodeBlocks(contents.document);
      }
    };

    const handleDisplayed = () => {
      scheduleDisplayedWork();
    };

    const hookableRendition = rendition as unknown as RenditionContentHookAccess;
    hookableRendition.hooks?.content?.register?.(handleContent);
    rendition.on("displayed", handleDisplayed);
    rendition.on("rendered", handleDisplayed);
    rendition.on("relocated", handleDisplayed);

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
      hookableRendition.hooks?.content?.deregister?.(handleContent);
      rendition.off("displayed", handleDisplayed);
      rendition.off("rendered", handleDisplayed);
      rendition.off("relocated", handleDisplayed);
    };
  }, [
    applyHighlights,
    buildParagraphLayoutIndex,
    currentLocationRef,
    epubContextRef,
    isRenditionReady,
    lastLayoutCfiRef,
    pageWidth,
    renditionRef,
  ]);
}
