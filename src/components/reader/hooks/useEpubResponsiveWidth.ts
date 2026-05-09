"use client";

import { useState, useEffect } from "react";
import { debounce } from "@/lib/utils";

/**
 * 根据视口宽度计算 EPUB 正文内容宽度百分比
 */
export function useEpubResponsiveWidth() {
  const [contentWidth, setContentWidth] = useState(100);

  useEffect(() => {
    const updatePageWidth = debounce(() => {
      const width = window.innerWidth;
      let newWidth = 100;
      if (width >= 1920) {
        newWidth = 36;
      } else if (width >= 1440) {
        newWidth = 49;
      } else if (width >= 1024) {
        newWidth = 64;
      } else if (width >= 768) {
        newWidth = 81;
      } else if (width >= 480) {
        newWidth = 90;
      }
      setContentWidth(newWidth);
    }, 200);

    updatePageWidth();
    window.addEventListener("resize", updatePageWidth);
    return () => {
      window.removeEventListener("resize", updatePageWidth);
    };
  }, []);

  return contentWidth;
}
