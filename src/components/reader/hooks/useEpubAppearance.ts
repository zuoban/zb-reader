"use client";

import { useEffect } from "react";
import type { MutableRefObject } from "react";
import type { Rendition } from "epubjs";
import { EpubContext } from "@/lib/epub-context";
import { THEME_STYLES } from "@/components/reader/epub-styles";
import { getEpubFontFamily } from "@/components/reader/epub-fonts";

interface UseEpubAppearanceParams {
  buildParagraphLayoutIndex: (doc: Document, containerWidth: number) => void;
  epubContextRef: MutableRefObject<EpubContext>;
  fontFamily?: string;
  fontSize: number;
  isRenditionReady: boolean;
  pageWidth: number;
  renditionRef: MutableRefObject<Rendition | null>;
  theme: "light" | "dark" | "sepia";
}

export function useEpubAppearance({
  buildParagraphLayoutIndex,
  epubContextRef,
  fontFamily,
  fontSize,
  isRenditionReady,
  pageWidth,
  renditionRef,
  theme,
}: UseEpubAppearanceParams) {
  useEffect(() => {
    const rendition = renditionRef.current;
    if (!rendition) return;

    const themeStyle = THEME_STYLES[theme];
    rendition.themes.select(theme);
    rendition.themes.override("background", themeStyle.body.background);
    rendition.themes.override("color", themeStyle.body.color);

    const doc = epubContextRef.current.getDocument();
    if (doc?.documentElement && doc.body) {
      doc.documentElement.style.background = themeStyle.html.background;
      doc.body.style.background = themeStyle.body.background;
      doc.body.style.color = themeStyle.body.color;
    }
  }, [epubContextRef, renditionRef, theme]);

  useEffect(() => {
    const rendition = renditionRef.current;
    if (!rendition) return;

    rendition.themes.override("font-size", `${fontSize}px`);

    const doc = epubContextRef.current.getDocument();
    const { width: containerWidth } = epubContextRef.current.getViewportSize();
    if (doc?.body) {
      buildParagraphLayoutIndex(doc, containerWidth);
    }
  }, [buildParagraphLayoutIndex, epubContextRef, fontSize, renditionRef]);

  useEffect(() => {
    const rendition = renditionRef.current;
    if (!rendition) return;

    rendition.themes.override("font-family", getEpubFontFamily(fontFamily));
  }, [fontFamily, renditionRef]);

  useEffect(() => {
    if (!isRenditionReady) return;

    epubContextRef.current.applyMaxWidthToChildren(pageWidth);
  }, [epubContextRef, pageWidth, isRenditionReady]);
}
