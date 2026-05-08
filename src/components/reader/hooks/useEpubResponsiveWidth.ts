"use client";

import { useState, useEffect } from "react";
import { debounce } from "@/lib/utils";

/**
 * 根据视口宽度计算 EPUB 阅读器的页面宽度百分比
 */
export function useEpubResponsiveWidth() {
  const [pageWidth, setPageWidth] = useState(100);

  useEffect(() => {
    const updatePageWidth = debounce(() => {
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
    }, 200);

    updatePageWidth();
    window.addEventListener("resize", updatePageWidth);
    return () => {
      window.removeEventListener("resize", updatePageWidth);
    };
  }, []);

  return pageWidth;
}
