"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, Square, SkipBack, SkipForward, LocateFixed, ListEnd, Maximize, Minimize } from "lucide-react";
import { cn } from "@/lib/utils";

interface TtsFloatingControlProps {
  isSpeaking: boolean;
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
  onJumpToPosition: _onJumpToPosition,
  ttsAutoNextChapter = false,
  onTtsAutoNextChapterChange,
  isFullscreen = false,
  onToggleFullscreen,
  autoScrollToActive = true,
  onAutoScrollToActiveChange,
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
            "flex items-center gap-0.5 sm:gap-1 px-1.5 py-1 mr-1",
            "rounded-xl",
            "backdrop-blur-xl",
            "border",
            "animate-in slide-in-from-right-2 fade-in duration-200 ease-out",
            "flex-wrap justify-center max-w-[calc(100vw-5rem)]"
          )}
          style={{
            background: "var(--reader-card-bg)",
            borderColor: "var(--reader-border)",
            boxShadow: "0 10px 24px -16px var(--reader-shadow)",
          }}
        >
          {onPrev && (
            <button
              type="button"
              onClick={onPrev}
              className="group flex size-7 sm:size-7 items-center justify-center rounded-lg transition-all duration-150 cursor-pointer active:scale-90 hover:bg-[var(--reader-primary-light,_rgba(23,23,23,0.1))]"
              style={{ color: "var(--reader-muted-text)" }}
              title="上一段"
            >
              <SkipBack className="size-3.5 transition-transform duration-150 group-hover:-translate-x-0.5" />
            </button>
          )}

          <button
            type="button"
            onClick={onToggle}
            className="group flex size-7 sm:size-7 items-center justify-center rounded-lg shadow-sm transition-all duration-150 cursor-pointer active:scale-90"
            style={{
              background: "var(--reader-primary, #171717)",
              color: "#ffffff",
            }}
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
            className="group flex size-7 sm:size-7 items-center justify-center rounded-lg transition-all duration-150 cursor-pointer active:scale-90 hover:bg-[var(--reader-primary-light,_rgba(23,23,23,0.1))]"
            style={{ color: "var(--reader-destructive, #dc2626)" }}
            title="停止"
          >
            <Square className="size-3" />
          </button>

          {onNext && (
            <button
              type="button"
              onClick={onNext}
              className="group flex size-7 sm:size-7 items-center justify-center rounded-lg transition-all duration-150 cursor-pointer active:scale-90 hover:bg-[var(--reader-primary-light,_rgba(23,23,23,0.1))]"
              style={{ color: "var(--reader-muted-text)" }}
              title="下一段"
            >
              <SkipForward className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
            </button>
          )}

          {onAutoScrollToActiveChange && (
            <>
              <div
                className="w-px h-4 mx-0.5 hidden sm:block"
                style={{ background: "var(--reader-border)" }}
              />
              <button
                type="button"
                onClick={() => onAutoScrollToActiveChange(!autoScrollToActive)}
                className={cn(
                  "group flex size-7 sm:size-7 items-center justify-center rounded-lg transition-all duration-150 cursor-pointer active:scale-90",
                  autoScrollToActive 
                    ? "shadow-sm" 
                    : "hover:bg-[var(--reader-primary-light,_rgba(23,23,23,0.1))]"
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
                    "size-3.5 transition-all duration-200",
                    autoScrollToActive && "scale-110"
                  )} 
                />
              </button>
            </>
          )}

          {onTtsAutoNextChapterChange && (
            <>
              <div
                className="w-px h-4 mx-0.5 hidden sm:block"
                style={{ background: "var(--reader-border)" }}
              />
              <button
                type="button"
                onClick={() => onTtsAutoNextChapterChange(!ttsAutoNextChapter)}
                className={cn(
                  "group flex size-7 sm:size-7 items-center justify-center rounded-lg transition-all duration-150 cursor-pointer active:scale-90",
                  ttsAutoNextChapter 
                    ? "shadow-sm" 
                    : "hover:bg-[var(--reader-primary-light,_rgba(23,23,23,0.1))]"
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
                    "size-3.5 transition-all duration-200",
                    ttsAutoNextChapter && "scale-110"
                  )} 
                />
              </button>
            </>
          )}

          {onToggleFullscreen && (
            <>
              <div
                className="w-px h-4 mx-0.5 hidden sm:block"
                style={{ background: "var(--reader-border)" }}
              />
              <button
                type="button"
                onClick={onToggleFullscreen}
                className="group flex size-7 sm:size-7 items-center justify-center rounded-lg transition-all duration-150 cursor-pointer active:scale-90 hover:bg-[var(--reader-primary-light,_rgba(23,23,23,0.1))]"
                style={{ color: "var(--reader-muted-text)" }}
                title={isFullscreen ? "退出全屏" : "全屏"}
              >
                {isFullscreen ? (
                  <Minimize className="size-3.5" />
                ) : (
                  <Maximize className="size-3.5" />
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
          "transition-all duration-200 ease-out",
          "shadow-lg border",
          "active:scale-95",
          isExpanded && "rotate-180"
        )}
        style={{
          background: "var(--reader-primary, #171717)",
          borderColor: "color-mix(in srgb, var(--reader-primary, #171717) 75%, #ffffff 25%)",
          color: "#ffffff",
          boxShadow: "0 12px 24px -14px var(--reader-shadow)",
        }}
        title="朗读控制"
      >
        <div
          className="absolute inset-0 rounded-full transition-opacity duration-300 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100"
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
            style={{ background: "rgba(255,255,255,0.8)" }}
          />
        )}
      </button>
    </div>
  );
}
