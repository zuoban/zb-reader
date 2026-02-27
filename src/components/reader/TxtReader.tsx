"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2 } from "lucide-react";

interface TxtReaderProps {
  url: string;
  initialPage?: number;
  fontSize?: number;
  theme?: "light" | "dark" | "sepia";
  onPageChange?: (page: number, totalPages: number) => void;
  activeTtsParagraph?: string;
  ttsPlaybackProgress?: number;
  onRegisterController?: (controller: { nextPage: () => boolean; prevPage: () => boolean; scrollDown: (amount?: number) => void; scrollUp: (amount?: number) => void; scrollToActiveParagraph: () => void }) => void;
}

const themeStyles: Record<string, { bg: string; text: string }> = {
  light: { bg: "bg-white", text: "text-black" },
  dark: { bg: "bg-[#1a1a2e]", text: "text-[#eee]" },
  sepia: { bg: "bg-[#f4ecd8]", text: "text-[#5b4636]" },
};

const TELEPROMPTER_FOLLOW_FACTOR = 0.16;
const TELEPROMPTER_VIEWPORT_ANCHOR = 0.42;

function TxtReader({
  url,
  initialPage: _initialPage,
  fontSize = 16,
  theme = "light",
  onPageChange,
  activeTtsParagraph,
  ttsPlaybackProgress = 0,
  onRegisterController,
}: TxtReaderProps) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  // rAF handle for lerp-based intra-paragraph scrolling
  const lerpRafIdRef = useRef<number | null>(null);
  // Timer handle: delay lerp start until smooth-scroll settles after paragraph switch
  const smoothScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function loadContent() {
      try {
        const res = await fetch(url);
        const text = await res.text();
        setContent(text);
      } catch {
        setContent("加载失败");
      } finally {
        setLoading(false);
      }
    }
    loadContent();
  }, [url]);

  const scrollDown = useCallback((amount = 300) => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ top: amount, behavior: "smooth" });
    }
  }, []);

  const scrollUp = useCallback((amount = 300) => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ top: -amount, behavior: "smooth" });
    }
  }, []);

  const scrollToActiveParagraph = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const activeElement = container.querySelector("[data-tts-active='1']") as HTMLElement | null;
    if (!activeElement) return;
    const elementRect = activeElement.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const targetScrollTop =
      container.scrollTop +
      (elementRect.top - containerRect.top) -
      container.clientHeight / 2 +
      elementRect.height / 2;
    container.scrollTo({ top: Math.max(0, targetScrollTop), behavior: "smooth" });
  }, []);

  useEffect(() => {
    onRegisterController?.({
      nextPage: () => {
        scrollDown();
        return true;
      },
      prevPage: () => {
        scrollUp();
        return true;
      },
      scrollDown,
      scrollUp,
      scrollToActiveParagraph,
    });
  }, [scrollDown, scrollUp, scrollToActiveParagraph, onRegisterController]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        scrollUp(100);
      } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        scrollDown(100);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [scrollDown, scrollUp]);

  useEffect(() => {
    if (!loading && content && onPageChange) {
      onPageChange(1, 1);
    }
  }, [loading, content, onPageChange]);

  const style = themeStyles[theme] || themeStyles.light;
  const paragraphs = content
    .split(/\n\s*\n+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  const normalizeText = (value: string) => value.replace(/\s+/g, "").trim();
  const activeNeedle = normalizeText(activeTtsParagraph || "").slice(0, 80);

  const getTeleprompterScrollTop = useCallback((element: HTMLElement, progress: number) => {
    const scrollRange = Math.max(0, element.scrollHeight - element.clientHeight);
    if (scrollRange <= 0) return 0;

    const clampedProgress = Math.min(1, Math.max(0, progress));
    const leadIn = 0.08;
    const leadOut = 0.94;

    if (clampedProgress <= leadIn) return 0;
    if (clampedProgress >= leadOut) return scrollRange;

    const normalized = (clampedProgress - leadIn) / (leadOut - leadIn);
    const eased = normalized * normalized * (3 - 2 * normalized);
    const contentPosition = eased * element.scrollHeight;
    const anchoredTop = contentPosition - element.clientHeight * TELEPROMPTER_VIEWPORT_ANCHOR;
    return Math.min(scrollRange, Math.max(0, anchoredTop));
  }, []);

  useEffect(() => {
    if (!activeNeedle) return;

    const container = containerRef.current;
    if (!container) return;

    const activeElement = container.querySelector("[data-tts-active='1']") as
      | HTMLElement
      | null;
    if (!activeElement) return;

    // Cancel any ongoing lerp animation before the paragraph-switch smooth scroll
    if (lerpRafIdRef.current !== null) {
      cancelAnimationFrame(lerpRafIdRef.current);
      lerpRafIdRef.current = null;
    }
    if (smoothScrollTimerRef.current !== null) {
      clearTimeout(smoothScrollTimerRef.current);
      smoothScrollTimerRef.current = null;
    }

    const elementRect = activeElement.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const targetScrollTop =
      container.scrollTop +
      (elementRect.top - containerRect.top) -
      container.clientHeight / 2 +
      elementRect.height / 2;
    container.scrollTo({ top: Math.max(0, targetScrollTop), behavior: "smooth" });
  }, [activeNeedle]);

  // Scroll within long paragraphs as playback progresses
  useEffect(() => {
    if (!activeNeedle) return;

    const container = containerRef.current;
    if (!container) return;

    const activeElement = container.querySelector("[data-tts-active='1']") as HTMLElement | null;
    if (!activeElement) return;

    const paragraphHeight = activeElement.offsetHeight;
    // Only scroll if the paragraph is taller than 80% of the visible container
    if (paragraphHeight <= container.clientHeight * 0.8) return;

    // Compute the element's absolute top within the scrollable container
    let elementAbsTop = 0;
    let node: HTMLElement | null = activeElement;
    while (node && node !== container) {
      elementAbsTop += node.offsetTop;
      node = node.offsetParent as HTMLElement | null;
    }

    const progressY = paragraphHeight * ttsPlaybackProgress;
    const targetScrollTop = elementAbsTop + progressY - container.clientHeight * 0.35;
    const clampedTarget = Math.max(0, targetScrollTop);

    // Cancel any previous lerp loop before starting a new one
    if (lerpRafIdRef.current !== null) {
      cancelAnimationFrame(lerpRafIdRef.current);
      lerpRafIdRef.current = null;
    }

    // Delay lerp start by 400 ms to let the paragraph-switch smooth scroll settle
    if (smoothScrollTimerRef.current !== null) {
      clearTimeout(smoothScrollTimerRef.current);
    }
    smoothScrollTimerRef.current = setTimeout(() => {
      smoothScrollTimerRef.current = null;
      const LERP_FACTOR = 0.1;
      const step = () => {
        if (!container) return;
        const current = container.scrollTop;
        const diff = clampedTarget - current;
        if (Math.abs(diff) < 0.5) {
          container.scrollTop = clampedTarget;
          lerpRafIdRef.current = null;
          return;
        }
        container.scrollTop = current + diff * LERP_FACTOR;
        lerpRafIdRef.current = requestAnimationFrame(step);
      };
      lerpRafIdRef.current = requestAnimationFrame(step);
    }, 400);
  }, [activeNeedle, ttsPlaybackProgress]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  
  const progressPercent = Math.min(100, Math.max(0, ttsPlaybackProgress * 100));

  
  return (
    <div className={`flex flex-col h-full ${style.bg}`}>
      <div
        ref={containerRef}
        className={`flex-1 overflow-auto px-6 py-6 w-full ${style.text} max-w-3xl mx-auto`}
        style={{
          fontSize: `${fontSize}px`,
          lineHeight: 1.8,
        }}
      >
        {paragraphs.length > 0 ? (
          <div
            data-reader-txt-page="true"
            className="space-y-4"
          >
            {paragraphs.map((paragraph, index) => {
              const paragraphKey = `${index}-${paragraph.slice(0, 12)}`;
              const isActive =
                !!activeNeedle &&
                normalizeText(paragraph).includes(activeNeedle);

              return (
                <p
                  key={paragraphKey}
                  data-tts-active={isActive ? "1" : undefined}
                  className={`whitespace-pre-wrap transition-all duration-300 rounded-lg relative leading-8 ${
                    isActive
                      ? ""
                      : "hover:bg-muted/30 -mx-2 px-2"
                  }`}
                >
                  {isActive && (
                    <>
                      <span
                        className="absolute -left-2 top-[0.2em] bottom-[0.2em] w-1 rounded-[2px]"
                        style={{ backgroundColor: "rgba(148, 163, 184, 0.3)" }}
                      />
                      <span
                        className="absolute -left-2 top-[0.2em] w-1 rounded-[2px] bg-primary transition-all duration-100"
                        style={{
                          height: `${progressPercent}%`,
                          boxShadow: "0 0 4px var(--primary, #3b82f6)",
                        }}
                      />
                      <span
                        className="absolute -left-2 w-1 h-1 rounded-full bg-primary animate-pulse"
                        style={{
                          top: `calc(0.2em + ${progressPercent}% - 0.4em)`,
                          boxShadow: "0 0 4px var(--primary, #3b82f6)",
                        }}
                      />
                    </>
                  )}
                  {paragraph}
                </p>
              );
            })}
          </div>
        ) : (
          <pre data-reader-txt-page="true" className="whitespace-pre-wrap font-[inherit] m-0">
            {content}
          </pre>
        )}
      </div>
    </div>
  );
}

export default TxtReader;
