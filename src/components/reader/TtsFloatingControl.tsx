"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, Square, SkipBack, SkipForward, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface TtsFloatingControlProps {
  isSpeaking: boolean;
  onToggle: () => void;
  onStop: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  ttsImmersiveMode?: boolean;
  onToggleImmersiveMode?: () => void;
}

export function TtsFloatingControl({
  isSpeaking,
  onToggle,
  onStop,
  onPrev,
  onNext,
  ttsImmersiveMode = false,
  onToggleImmersiveMode,
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
        "flex items-center gap-2",
        "transition-all duration-300 ease-out",
        !isSpeaking && "pointer-events-none opacity-0",
        isAutoTransparent && isSpeaking && !isExpanded
          ? "opacity-40 scale-95"
          : isSpeaking && "opacity-90 scale-100 hover:opacity-100"
      )}
      onPointerEnter={handleInteraction}
    >
      {isExpanded && (
        <div
          className={cn(
            "flex items-center gap-1.5 rounded-2xl bg-gradient-to-br from-primary to-primary/90 px-3 py-2 shadow-2xl",
            "animate-in slide-in-from-right-2 fade-in duration-300",
            "border border-primary-foreground/20"
          )}
        >
          {onPrev && (
            <button
              type="button"
              onClick={onPrev}
              className="flex size-8 items-center justify-center rounded-xl bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 transition-all duration-200 cursor-pointer hover:scale-110 active:scale-95"
              title="上一段"
            >
              <SkipBack className="size-4" />
            </button>
          )}

          <button
            type="button"
            onClick={onToggle}
            className="flex size-9 items-center justify-center rounded-xl bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30 transition-all duration-200 cursor-pointer hover:scale-110 active:scale-95 shadow-lg"
            title={isSpeaking ? "暂停" : "播放"}
          >
            {isSpeaking ? (
              <Pause className="size-4" />
            ) : (
              <Play className="size-4 ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={onStop}
            className="flex size-8 items-center justify-center rounded-xl bg-destructive/20 text-destructive-foreground hover:bg-destructive/30 transition-all duration-200 cursor-pointer hover:scale-110 active:scale-95"
            title="停止"
          >
            <Square className="size-3.5" />
          </button>

          {onNext && (
            <button
              type="button"
              onClick={onNext}
              className="flex size-8 items-center justify-center rounded-xl bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 transition-all duration-200 cursor-pointer hover:scale-110 active:scale-95"
              title="下一段"
            >
              <SkipForward className="size-4" />
            </button>
          )}

          {onToggleImmersiveMode && (
            <button
              type="button"
              onClick={onToggleImmersiveMode}
              className={cn(
                "flex size-8 items-center justify-center rounded-xl transition-all duration-200 cursor-pointer hover:scale-110 active:scale-95",
                ttsImmersiveMode
                  ? "bg-primary-foreground/30 text-primary-foreground"
                  : "bg-primary-foreground/10 text-primary-foreground/70 hover:bg-primary-foreground/20 hover:text-primary-foreground"
              )}
              title={ttsImmersiveMode ? "关闭沉浸模式" : "开启沉浸模式"}
            >
              {ttsImmersiveMode ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={handleMainClick}
        className={cn(
          "flex size-11 items-center justify-center rounded-2xl shadow-2xl transition-all duration-300 ease-out cursor-pointer",
          "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground",
          "border border-primary-foreground/20",
          isSpeaking && "ring-3 ring-primary/40 ring-offset-3 ring-offset-background animate-pulse-subtle"
        )}
        style={{
          animation: isSpeaking ? "pulse-glow 2s ease-in-out infinite" : undefined,
        }}
        title="朗读控制"
      >
        {isSpeaking ? (
          <Pause className="size-4.5" />
        ) : (
          <Play className="size-4.5 ml-0.5" />
        )}
      </button>
    </div>
  );
}
