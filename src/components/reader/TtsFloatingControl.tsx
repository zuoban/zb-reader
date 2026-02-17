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
}

export function TtsFloatingControl({
  isSpeaking,
  onToggle,
  onStop,
  onPrev,
  onNext,
}: TtsFloatingControlProps) {
  const [position, setPosition] = useState(() => {
    if (typeof window === "undefined") return { x: 20, y: 100 };
    const savedX = localStorage.getItem("tts-floating-x");
    const savedY = localStorage.getItem("tts-floating-y");
    if (savedX && savedY) {
      return { x: Number(savedX), y: Number(savedY) };
    }
    return { x: 20, y: 100 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAutoTransparent, setIsAutoTransparent] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const hasMovedRef = useRef(false);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    localStorage.setItem("tts-floating-x", String(position.x));
    localStorage.setItem("tts-floating-y", String(position.y));
  }, [position.x, position.y]);

  const clearFadeTimer = useCallback(() => {
    if (!fadeTimerRef.current) return;
    clearTimeout(fadeTimerRef.current);
    fadeTimerRef.current = null;
  }, []);

  const scheduleAutoTransparent = useCallback(() => {
    clearFadeTimer();

    if (!isSpeaking || isExpanded || isDragging) {
      setIsAutoTransparent(false);
      return;
    }

    fadeTimerRef.current = setTimeout(() => {
      setIsAutoTransparent(true);
    }, 1800);
  }, [clearFadeTimer, isDragging, isExpanded, isSpeaking]);

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

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    handleInteraction();
    hasMovedRef.current = false;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [handleInteraction, position]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    handleInteraction();

    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;

    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      hasMovedRef.current = true;
    }

    const newX = dragStartRef.current.posX + deltaX;
    const newY = dragStartRef.current.posY + deltaY;

    const container = containerRef.current;
    if (container) {
      const maxX = window.innerWidth - container.offsetWidth;
      const maxY = window.innerHeight - container.offsetHeight;
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    }
  }, [handleInteraction, isDragging]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    handleInteraction();
    if (isDragging) {
      setIsDragging(false);
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    }
  }, [handleInteraction, isDragging]);

  const handleMainClick = useCallback(() => {
    handleInteraction();
    if (!hasMovedRef.current) {
      setIsExpanded((prev) => !prev);
    }
  }, [handleInteraction]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "fixed z-50 flex items-center gap-2 transition-shadow transition-opacity",
        isDragging ? "" : "transition-all duration-200"
        ,
        isAutoTransparent && !isExpanded && !isDragging ? "opacity-45" : "opacity-60"
      )}
      style={{
        left: position.x,
        top: position.y,
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerEnter={handleInteraction}
    >
      {isExpanded && (
        <div
          className={cn(
            "flex items-center gap-1 rounded-full bg-primary px-2 py-1.5 shadow-lg",
            "animate-in slide-in-from-right-2 duration-200"
          )}
        >
          {onPrev && (
            <button
              type="button"
              onClick={onPrev}
              className="flex size-7 items-center justify-center rounded-full text-primary-foreground hover:bg-primary-foreground/20 transition-colors cursor-pointer"
              title="上一段"
            >
              <SkipBack className="size-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={onToggle}
            className="flex size-7 items-center justify-center rounded-full text-primary-foreground hover:bg-primary-foreground/20 transition-colors cursor-pointer"
            title={isSpeaking ? "暂停" : "播放"}
          >
            {isSpeaking ? (
              <Pause className="size-3.5" />
            ) : (
              <Play className="size-3.5" />
            )}
          </button>

          <button
            type="button"
            onClick={onStop}
            className="flex size-7 items-center justify-center rounded-full text-primary-foreground hover:bg-primary-foreground/20 transition-colors cursor-pointer"
            title="停止"
          >
            <Square className="size-3.5" />
          </button>

          {onNext && (
            <button
              type="button"
              onClick={onNext}
              className="flex size-7 items-center justify-center rounded-full text-primary-foreground hover:bg-primary-foreground/20 transition-colors cursor-pointer"
              title="下一段"
            >
              <SkipForward className="size-3.5" />
            </button>
          )}
        </div>
      )}

      <button
        type="button"
        onPointerDown={handlePointerDown}
        onClick={handleMainClick}
        className={cn(
          "flex size-10 items-center justify-center rounded-full shadow-lg transition-all cursor-pointer",
          "bg-primary text-primary-foreground",
          isDragging && "scale-110 shadow-xl",
          isSpeaking && "ring-2 ring-primary-foreground/30 ring-offset-2 ring-offset-primary"
        )}
        title="朗读控制"
      >
        {isSpeaking ? (
          <Pause className="size-4" />
        ) : (
          <Play className="size-4" />
        )}
      </button>
    </div>
  );
}
