"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, Square, SkipBack, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";

interface TtsFloatingControlProps {
  isSpeaking: boolean;
  onToggle: () => void;
  onStop: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  currentParagraphIndex?: number;
  totalParagraphs?: number;
  paragraphProgress?: number;
}

function AudioWaveIndicator() {
  return (
    <div className="flex items-center justify-center gap-0.5 h-4">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="w-0.5 bg-current rounded-full animate-audio-wave"
          style={{
            animationDelay: `${i * 100}ms`,
            height: "100%",
          }}
        />
      ))}
    </div>
  );
}

export function TtsFloatingControl({
  isSpeaking,
  onToggle,
  onStop,
  onPrev,
  onNext,
  currentParagraphIndex = 0,
  totalParagraphs = 0,
  paragraphProgress = 0,
}: TtsFloatingControlProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAutoTransparent, setIsAutoTransparent] = useState(false);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearFadeTimer = useCallback(() => {
    if (!fadeTimerRef.current) return;
    clearTimeout(fadeTimerRef.current);
    fadeTimerRef.current = null;
  }, []);

  const scheduleAutoTransparent = useCallback(() => {
    clearFadeTimer();

    if (!isSpeaking || isExpanded) {
      setTimeout(() => {
        setIsAutoTransparent(false);
      }, 0);
      return;
    }

    fadeTimerRef.current = setTimeout(() => {
      setIsAutoTransparent(true);
    }, 1800);
  }, [clearFadeTimer, isExpanded, isSpeaking]);

  const handleInteraction = useCallback(() => {
    if (isAutoTransparent) {
      setIsAutoTransparent(false);
    }
    scheduleAutoTransparent();
  }, [isAutoTransparent, scheduleAutoTransparent]);

  useEffect(() => {
    scheduleAutoTransparent();
    return () => clearFadeTimer();
  }, [clearFadeTimer, scheduleAutoTransparent]);

  const handleMainClick = useCallback(() => {
    handleInteraction();
    setIsExpanded((prev) => !prev);
  }, [handleInteraction]);

  return (
    <div
      className={cn(
        "fixed z-50 left-1/2 top-4 -translate-x-1/2",
        "flex items-center",
        "transition-all duration-300 ease-out",
        !isSpeaking && "pointer-events-none opacity-0 -translate-y-2",
        isSpeaking && "opacity-100 translate-y-0",
        isAutoTransparent && isSpeaking && !isExpanded && "opacity-30 scale-95"
      )}
      onPointerEnter={handleInteraction}
    >
      {isExpanded && (
        <div
          className={cn(
            "flex items-center gap-0.5 px-1.5 py-1 mr-1",
            "rounded-full",
            "bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl",
            "border border-slate-200/60 dark:border-slate-600/60",
            "shadow-md",
            "animate-in slide-in-from-right-4 fade-in duration-200 ease-out"
          )}
        >
          {onPrev && (
            <button
              type="button"
              onClick={onPrev}
              className="group flex size-7 items-center justify-center rounded-full text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-150 cursor-pointer active:scale-90"
              title="上一段"
            >
              <SkipBack className="size-3.5 transition-transform duration-150 group-hover:-translate-x-0.5" />
            </button>
          )}

          <button
            type="button"
            onClick={onToggle}
            className="group flex size-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm hover:bg-emerald-600 transition-all duration-150 cursor-pointer active:scale-90"
            title={isSpeaking ? "暂停" : "播放"}
          >
            {isSpeaking ? (
              <Pause className="size-3.5" />
            ) : (
              <Play className="size-3.5 ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={onStop}
            className="group flex size-7 items-center justify-center rounded-full text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-all duration-150 cursor-pointer active:scale-90"
            title="停止"
          >
            <Square className="size-3" />
          </button>

          {onNext && (
            <button
              type="button"
              onClick={onNext}
              className="group flex size-7 items-center justify-center rounded-full text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-150 cursor-pointer active:scale-90"
              title="下一段"
            >
              <SkipForward className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
            </button>
          )}

          <div className="w-px h-4 bg-slate-200 dark:bg-slate-600 mx-0.5" />

          {totalParagraphs > 0 && (
            <div className="flex items-center gap-1.5 px-2">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300 min-w-[3rem] text-center">
                {currentParagraphIndex + 1}/{totalParagraphs}
              </span>
              <div className="w-12 h-1 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-150 rounded-full"
                  style={{ width: `${Math.min(100, Math.max(0, paragraphProgress * 100))}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={handleMainClick}
        className={cn(
          "group relative flex size-10 items-center justify-center rounded-full cursor-pointer",
          "transition-all duration-200 ease-out",
          "bg-emerald-500 text-white",
          "shadow-md shadow-emerald-500/25",
          "hover:shadow-lg hover:shadow-emerald-500/30 hover:bg-emerald-600",
          "active:scale-95",
          isExpanded && "rotate-180"
        )}
        title="朗读控制"
      >
        <div
          className={cn(
            "absolute inset-0 rounded-full transition-opacity duration-300",
            "bg-gradient-to-br from-white/20 to-transparent",
            "opacity-0 group-hover:opacity-100"
          )}
        />
        
        {isSpeaking && !isExpanded && (
          <AudioWaveIndicator />
        )}
        
        {isSpeaking && isExpanded && (
          <Pause className="size-4 relative z-10" />
        )}
        
        {!isSpeaking && (
          <Play className="size-4 ml-0.5 relative z-10" />
        )}

        {isSpeaking && (
          <span
            className={cn(
              "absolute -bottom-0.5 left-1/2 -translate-x-1/2",
              "w-1.5 h-1.5 rounded-full bg-white/80",
              "animate-pulse"
            )}
          />
        )}
      </button>
    </div>
  );
}
