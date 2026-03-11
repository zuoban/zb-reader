"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, Square, SkipBack, SkipForward, LocateFixed, ListEnd, Maximize, Minimize } from "lucide-react";
import { cn } from "@/lib/utils";

interface TtsFloatingControlProps {
  isSpeaking: boolean;
  isPaused?: boolean;
  onToggle: () => void;
  onStop: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onJumpToPosition?: () => void;
  ttsAutoNextChapter?: boolean;
  onTtsAutoNextChapterChange?: (value: boolean) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  autoScrollToActive?: boolean;
  onAutoScrollToActiveChange?: (value: boolean) => void;
  progress?: number;
}

function AudioWaveIndicator() {
  return (
    <div className="flex items-center justify-center gap-[2px] h-4">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="w-[2px] bg-current rounded-full animate-audio-wave"
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
  isPaused = false,
  onToggle,
  onStop,
  onPrev,
  onNext,
  onJumpToPosition: _onJumpToPosition,
  ttsAutoNextChapter = false,
  onTtsAutoNextChapterChange,
  isFullscreen = false,
  onToggleFullscreen,
  autoScrollToActive = true,
  onAutoScrollToActiveChange,
  progress: _progress = 0,
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
        "fixed bottom-5 right-3 sm:bottom-6 sm:right-4 z-50",
        "flex items-center",
        "transition-all duration-300 ease-out",
        !isSpeaking && "pointer-events-none opacity-0 translate-y-2",
        isSpeaking && "opacity-100 translate-y-0",
        isAutoTransparent && isSpeaking && !isExpanded && "opacity-30 scale-95"
      )}
      onPointerEnter={handleInteraction}
    >
      {isExpanded && (
        <div
          className={cn(
            "flex items-center gap-1 sm:gap-1.5 px-2 py-1.5 mr-2",
            "rounded-2xl",
            "backdrop-blur-xl",
            "border",
            "shadow-[0_8px_24px_-8px_rgba(0,0,0,0.15),0_4px_8px_-4px_rgba(0,0,0,0.1)]",
            "animate-in slide-in-from-right-3 fade-in duration-300 ease-out",
            "flex-wrap justify-center max-w-[calc(100vw-5rem)]"
          )}
          style={{
            background: "var(--reader-card-bg, rgba(255,255,255,0.95))",
            borderColor: "var(--reader-border, rgba(0,0,0,0.08))",
          }}
        >
          {onPrev && (
            <button
              type="button"
              onClick={onPrev}
              className="group flex size-7 sm:size-8 items-center justify-center rounded-xl transition-all duration-200 cursor-pointer active:scale-88 hover:scale-105 hover:bg-[var(--reader-primary-light,_rgba(23,23,23,0.08))]"
              style={{ color: "var(--reader-muted-text)" }}
              title="上一段"
            >
              <SkipBack className="size-3.5 transition-transform duration-150 group-hover:-translate-x-0.5" />
            </button>
          )}

          <button
            type="button"
            onClick={onToggle}
            className="group flex size-8 sm:size-9 items-center justify-center rounded-xl shadow-md transition-all duration-200 cursor-pointer hover:scale-105 active:scale-92"
            style={{
              background: "var(--reader-primary, #171717)",
              color: "#ffffff",
            }}
            title={isPaused ? "播放" : "暂停"}
          >
            {isPaused ? (
              <Play className="size-4 ml-0.5 transition-transform duration-150 group-hover:scale-110" />
            ) : (
              <Pause className="size-4 transition-transform duration-150 group-hover:scale-110" />
            )}
          </button>

          <button
            type="button"
            onClick={onStop}
            className="group flex size-7 sm:size-8 items-center justify-center rounded-xl transition-all duration-200 cursor-pointer active:scale-88 hover:scale-105 hover:bg-red-50"
            style={{ color: "var(--reader-destructive, #dc2626)" }}
            title="停止"
          >
            <Square className="size-3.5 transition-transform duration-150 group-hover:scale-110" />
          </button>

          {onNext && (
            <button
              type="button"
              onClick={onNext}
              className="group flex size-7 sm:size-8 items-center justify-center rounded-xl transition-all duration-200 cursor-pointer active:scale-88 hover:scale-105 hover:bg-[var(--reader-primary-light,_rgba(23,23,23,0.08))]"
              style={{ color: "var(--reader-muted-text)" }}
              title="下一段"
            >
              <SkipForward className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
            </button>
          )}

          {onAutoScrollToActiveChange && (
            <>
              <div
                className="w-px h-5 mx-0.5 hidden sm:block"
                style={{ background: "var(--reader-border)" }}
              />
              <button
                type="button"
                onClick={() => onAutoScrollToActiveChange(!autoScrollToActive)}
                className={cn(
                  "group flex size-7 sm:size-8 items-center justify-center rounded-xl transition-all duration-200 cursor-pointer active:scale-88 hover:scale-105",
                  autoScrollToActive 
                    ? "shadow-sm" 
                    : "hover:bg-[var(--reader-primary-light,_rgba(23,23,23,0.08))]"
                )}
                style={{ 
                  color: autoScrollToActive 
                    ? "#ffffff" 
                    : "var(--reader-muted-text)",
                  background: autoScrollToActive 
                    ? "var(--reader-primary, #171717)" 
                    : "transparent"
                }}
                title={autoScrollToActive ? "关闭自动定位" : "开启自动定位"}
              >
                <LocateFixed 
                  className={cn(
                    "size-4 transition-all duration-200",
                    autoScrollToActive && "scale-110"
                  )} 
                />
              </button>
            </>
          )}

          {onTtsAutoNextChapterChange && (
            <>
              <div
                className="w-px h-5 mx-0.5 hidden sm:block"
                style={{ background: "var(--reader-border)" }}
              />
              <button
                type="button"
                onClick={() => onTtsAutoNextChapterChange(!ttsAutoNextChapter)}
                className={cn(
                  "group flex size-7 sm:size-8 items-center justify-center rounded-xl transition-all duration-200 cursor-pointer active:scale-88 hover:scale-105",
                  ttsAutoNextChapter 
                    ? "shadow-sm" 
                    : "hover:bg-[var(--reader-primary-light,_rgba(23,23,23,0.08))]"
                )}
                style={{ 
                  color: ttsAutoNextChapter 
                    ? "#ffffff" 
                    : "var(--reader-muted-text)",
                  background: ttsAutoNextChapter 
                    ? "var(--reader-primary, #171717)" 
                    : "transparent"
                }}
                title={ttsAutoNextChapter ? "关闭自动续章" : "开启自动续章"}
              >
                <ListEnd 
                  className={cn(
                    "size-4 transition-all duration-200",
                    ttsAutoNextChapter && "scale-110"
                  )} 
                />
              </button>
            </>
          )}

          {onToggleFullscreen && (
            <>
              <div
                className="w-px h-5 mx-0.5 hidden sm:block"
                style={{ background: "var(--reader-border)" }}
              />
              <button
                type="button"
                onClick={onToggleFullscreen}
                className="group flex size-7 sm:size-8 items-center justify-center rounded-xl transition-all duration-200 cursor-pointer active:scale-88 hover:scale-105 hover:bg-[var(--reader-primary-light,_rgba(23,23,23,0.08))]"
                style={{ color: "var(--reader-muted-text)" }}
                title={isFullscreen ? "退出全屏" : "全屏"}
              >
                {isFullscreen ? (
                  <Minimize className="size-4 transition-transform duration-150 group-hover:scale-110" />
                ) : (
                  <Maximize className="size-4 transition-transform duration-150 group-hover:scale-110" />
                )}
              </button>
            </>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={handleMainClick}
        className={cn(
          "group relative flex size-10 items-center justify-center rounded-full cursor-pointer",
          "transition-all duration-300 ease-out",
          "shadow-[0_8px_24px_-6px_rgba(0,0,0,0.25),0_4px_8px_-4px_rgba(0,0,0,0.15)]",
          "border",
          "hover:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.3),0_6px_12px_-6px_rgba(0,0,0,0.2)]",
          "active:shadow-[0_4px_12px_-4px_rgba(0,0,0,0.2)]",
          "active:scale-92",
          isExpanded && "rotate-180"
        )}
        style={{
          background: `linear-gradient(135deg, var(--reader-primary, #171717) 0%, color-mix(in srgb, var(--reader-primary, #171717) 70%, #000) 100%)`,
          borderColor: "color-mix(in srgb, var(--reader-primary, #171717) 60%, #ffffff 40%)",
          color: "#ffffff",
        }}
        title="朗读控制"
      >
        <div
          className="absolute inset-0 rounded-full transition-opacity duration-300 bg-gradient-to-br from-white/15 to-white/0 opacity-0 group-hover:opacity-100"
        />

        {isSpeaking && !isExpanded && <AudioWaveIndicator />}

        {isSpeaking && isExpanded && (
          <Pause className="size-4 relative z-10" />
        )}

        {!isSpeaking && (
          <Play className="size-4 ml-0.5 relative z-10" />
        )}

        {isSpeaking && (
          <span
            className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: "rgba(255,255,255,0.9)" }}
          />
        )}
      </button>
    </div>
  );
}
