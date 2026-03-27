"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { usePathname } from "next/navigation";
import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReaderRouteTransitionDetail {
  href: string;
  bookId?: string;
  title: string;
  author?: string;
  coverUrl?: string;
  hasCover: boolean;
  format?: string;
  initial: string;
  rect: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
}

type TransitionMode = "enter" | "exit";

interface TransitionState extends ReaderRouteTransitionDetail {
  mode: TransitionMode;
  stage: "launching" | "expanding" | "settling";
}

const ENTER_TRANSITION_EVENT = "zb-reader:navigate-to-reader";
const EXIT_TRANSITION_EVENT = "zb-reader:leave-reader";
export const READER_RETURN_SPOTLIGHT_KEY = "zb-reader:return-book-id";
const CLEAR_DELAY_MS = 420;

export function ReaderRouteTransition() {
  const pathname = usePathname();
  const [transition, setTransition] = useState<TransitionState | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setPrefersReducedMotion(mediaQuery.matches);
    sync();

    mediaQuery.addEventListener("change", sync);
    return () => mediaQuery.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleTransition = (event: Event, mode: TransitionMode) => {
      if (prefersReducedMotion) return;

      const detail = (event as CustomEvent<ReaderRouteTransitionDetail>).detail;
      if (!detail?.href) return;

      if (mode === "exit" && detail.bookId && typeof window !== "undefined") {
        window.sessionStorage.setItem(READER_RETURN_SPOTLIGHT_KEY, detail.bookId);
      }

      setTransition({
        ...detail,
        mode,
        stage: "launching",
      });

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          setTransition((current) =>
            current?.href === detail.href
              ? { ...current, stage: "expanding" }
              : current
          );
        });
      });
    };

    const handleEnter = (event: Event) => handleTransition(event, "enter");
    const handleExit = (event: Event) => handleTransition(event, "exit");

    window.addEventListener(ENTER_TRANSITION_EVENT, handleEnter as EventListener);
    window.addEventListener(EXIT_TRANSITION_EVENT, handleExit as EventListener);

    return () => {
      window.removeEventListener(ENTER_TRANSITION_EVENT, handleEnter as EventListener);
      window.removeEventListener(EXIT_TRANSITION_EVENT, handleExit as EventListener);
    };
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (!transition) return;

    if (pathname === transition.href && transition.stage !== "settling") {
      setTransition((current) =>
        current && current.stage !== "settling"
          ? { ...current, stage: "settling" }
          : current
      );

      const timer = window.setTimeout(() => {
        setTransition(null);
      }, CLEAR_DELAY_MS);

      return () => window.clearTimeout(timer);
    }

    const fallbackTimer = window.setTimeout(() => {
      setTransition(null);
    }, 1800);

    return () => window.clearTimeout(fallbackTimer);
  }, [pathname, transition]);

  const transitionMetrics = useMemo(() => {
    if (typeof window === "undefined") {
      return { width: 280, height: 396, translateY: -54, headerTop: "14%" };
    }

    const isMobile = window.innerWidth < 640;
    const width = isMobile
      ? Math.min(276, Math.max(208, window.innerWidth * 0.5))
      : Math.min(292, Math.max(224, window.innerWidth * 0.22));
    return {
      width,
      height: width * 1.36,
      translateY: isMobile ? -50 : -54,
      headerTop: isMobile ? "11%" : "14%",
    };
  }, [transition?.href]);

  if (!transition || prefersReducedMotion) {
    return null;
  }

  const isExpanded =
    transition.stage === "expanding" || transition.stage === "settling";
  const isSettling = transition.stage === "settling";
  const isEnter = transition.mode === "enter";

  const coverStyle: CSSProperties = isEnter
    ? isExpanded
      ? {
          left: "50%",
          top: "50%",
          width: `${transitionMetrics.width}px`,
          height: `${transitionMetrics.height}px`,
          transform: `translate(-50%, ${transitionMetrics.translateY}%) scale(1)`,
        }
      : {
          left: `${transition.rect.left}px`,
          top: `${transition.rect.top}px`,
          width: `${transition.rect.width}px`,
          height: `${transition.rect.height}px`,
          transform: "translate3d(0, 0, 0) scale(1)",
        }
    : isExpanded
      ? {
          left: "50%",
          top: "50%",
          width: "172px",
          height: "234px",
          transform: "translate(-50%, -50%) scale(0.92)",
        }
      : {
          left: "50%",
          top: "50%",
          width: `${transitionMetrics.width}px`,
          height: `${transitionMetrics.height}px`,
          transform: `translate(-50%, ${transitionMetrics.translateY}%) scale(1)`,
        };

  return (
    <div className="pointer-events-none fixed inset-0 z-[95] overflow-hidden">
      <div
        className="absolute inset-0 transition-all duration-500 ease-out"
        style={{
          opacity: isSettling ? 0 : isExpanded || !isEnter ? 1 : 0,
          background:
            "radial-gradient(circle at 50% 24%, color-mix(in srgb, var(--reader-primary, #171717) 12%, transparent) 0%, transparent 30%), linear-gradient(180deg, color-mix(in srgb, var(--reader-bg, #ffffff) 62%, transparent) 0%, color-mix(in srgb, var(--reader-bg, #ffffff) 94%, var(--reader-text, #171717) 6%) 100%)",
          backdropFilter: "blur(16px)",
        }}
      />

      <div
        className="absolute left-1/2 top-1/2 h-[26rem] w-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl transition-opacity duration-500"
        style={{
          opacity: isSettling ? 0 : isExpanded || !isEnter ? 0.88 : 0,
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--reader-primary, #171717) 10%, transparent) 0%, transparent 68%)",
        }}
      />

      <div
        className="absolute overflow-hidden rounded-[28px] border transition-all duration-[460ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{
          ...coverStyle,
          opacity: isSettling ? 0 : 1,
          borderColor: "color-mix(in srgb, var(--reader-text, #171717) 10%, transparent)",
          boxShadow:
            "0 26px 80px -38px color-mix(in srgb, var(--reader-text, #171717) 38%, transparent), inset 0 1px 0 color-mix(in srgb, white 60%, transparent)",
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--reader-card-bg, rgba(255,255,255,0.92)) 88%, white 12%) 0%, color-mix(in srgb, var(--reader-card-bg, rgba(255,255,255,0.92)) 96%, transparent) 100%)",
        }}
      >
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.14),transparent_22%,transparent_80%,rgba(255,255,255,0.08))]" />

        <div className="relative h-full w-full overflow-hidden">
          {transition.hasCover && transition.coverUrl ? (
            <img
              src={transition.coverUrl}
              alt={transition.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(145deg,#4f46e5_0%,#7c3aed_45%,#ec4899_100%)]">
              <div className="absolute inset-0 opacity-35 [background-image:radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.28)_0%,transparent_28%),radial-gradient(circle_at_82%_78%,rgba(255,255,255,0.18)_0%,transparent_24%)]" />
              <span className="relative text-6xl font-black tracking-tight text-white/92">
                {transition.initial}
              </span>
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 p-4">
            <div
              className={cn(
                "rounded-[22px] border px-4 py-3 backdrop-blur-xl transition-all duration-500",
                isExpanded ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              )}
              style={{
                borderColor:
                  "color-mix(in srgb, white 18%, transparent)",
                background:
                  "linear-gradient(180deg, rgba(12,16,24,0.72) 0%, rgba(12,16,24,0.44) 100%)",
              }}
            >
              <p className="truncate text-[11px] uppercase tracking-[0.18em] text-white/58">
                {isEnter ? "准备进入阅读" : "准备返回书架"}
              </p>
              <h3 className="mt-1 truncate text-base font-semibold text-white">
                {transition.title}
              </h3>
              <div className="mt-1 flex items-center gap-2 text-xs text-white/68">
                <span className="truncate">
                  {transition.author || "未知作者"}
                </span>
                <span className="text-white/24">/</span>
                <span>{transition.format?.toUpperCase() || "BOOK"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border px-4 py-2 backdrop-blur-xl transition-all duration-500"
        style={{
          top: transitionMetrics.headerTop,
          opacity: isSettling ? 0 : isExpanded || !isEnter ? 1 : 0,
          transform:
            isExpanded || !isEnter
              ? "translate(-50%, 0)"
              : "translate(-50%, 14px)",
          borderColor:
            "color-mix(in srgb, var(--reader-text, #171717) 10%, transparent)",
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--reader-card-bg, rgba(255,255,255,0.92)) 82%, white 18%) 0%, color-mix(in srgb, var(--reader-card-bg, rgba(255,255,255,0.92)) 96%, transparent) 100%)",
          color: "var(--reader-text, #171717)",
        }}
      >
        <BookOpen className="size-4" />
        <span className="text-sm font-medium">
          {isEnter ? "进入阅读模式" : "返回书架"}
        </span>
      </div>
    </div>
  );
}

export const READER_ROUTE_TRANSITION_EVENT = ENTER_TRANSITION_EVENT;
export const READER_ROUTE_EXIT_EVENT = EXIT_TRANSITION_EVENT;
