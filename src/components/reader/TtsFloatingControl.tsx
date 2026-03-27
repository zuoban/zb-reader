"use client";

import { useCallback, useState } from "react";
import { BookOpen, Pause, Play, Square, SkipBack, SkipForward, LocateFixed, ListEnd, Maximize, Minimize } from "lucide-react";
import { cn } from "@/lib/utils";

interface TtsFloatingControlProps {
  isSpeaking: boolean;
  hidden?: boolean;
  isPaused?: boolean;
  onToggle: () => void;
  onStop: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onJumpToPosition?: () => void;
  onOpenImmersiveView?: () => void;
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
  hidden = false,
  isPaused = false,
  onToggle,
  onStop,
  onPrev,
  onNext,
  onJumpToPosition: _onJumpToPosition,
  onOpenImmersiveView,
  ttsAutoNextChapter = false,
  onTtsAutoNextChapterChange,
  isFullscreen = false,
  onToggleFullscreen,
  autoScrollToActive = true,
  onAutoScrollToActiveChange,
  progress: _progress = 0,
}: TtsFloatingControlProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const clampedProgress = Math.min(1, Math.max(0, _progress));

  const handleMainClick = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const handleOpenImmersiveView = useCallback(() => {
    onOpenImmersiveView?.();
    setIsExpanded(false);
  }, [onOpenImmersiveView]);

  return (
    <div
      className={cn(
        "fixed bottom-5 right-3 sm:bottom-6 sm:right-4 z-50",
        "flex items-center",
        "transition-all duration-300 ease-out",
        (hidden || !isSpeaking) && "pointer-events-none opacity-0 translate-y-2",
        !hidden && isSpeaking && "opacity-100 translate-y-0"
      )}
    >
      {isExpanded && (
        <div
          className={cn(
            "animate-reader-fade-up mr-2 flex max-w-[calc(100vw-5rem)] flex-wrap items-center justify-center gap-1 px-2 py-1.5 sm:gap-1.5 sm:px-2.5 sm:py-2",
            "rounded-[28px]",
            "backdrop-blur-2xl",
            "border",
            "shadow-lg",
            "animate-in slide-in-from-right-3 fade-in duration-300 ease-out",
          )}
          style={{
            background:
              "color-mix(in srgb, var(--reader-card-bg, rgba(255,255,255,0.95)) 90%, white 10%)",
            borderColor:
              "color-mix(in srgb, var(--reader-text, #171717) 10%, transparent)",
            boxShadow:
              "0 18px 36px -30px color-mix(in srgb, var(--reader-text, #171717) 35%, transparent)",
          }}
        >
          {onPrev && (
            <button
              type="button"
              onClick={onPrev}
              className="group flex size-7 sm:size-8 items-center justify-center rounded-full border transition-all duration-200 cursor-pointer border-[color-mix(in_srgb,var(--reader-border)_45%,_transparent)]"
              style={{
                color: "var(--reader-text, #09090b)",
                background:
                  "color-mix(in srgb, var(--reader-card-bg, rgba(255,255,255,0.9)) 35%, transparent)",
              }}
              title="上一段"
            >
              <SkipBack className="size-3.5 transition-transform duration-150 group-hover:-translate-x-0.5" />
            </button>
          )}

          <button
            type="button"
            onClick={onToggle}
            className="group flex size-8 sm:size-9 items-center justify-center rounded-full transition-all duration-200 cursor-pointer border border-[color-mix(in_srgb,var(--reader-border)_45%,_transparent)]"
            style={{
              color: "var(--reader-text, #09090b)",
              background:
                "color-mix(in srgb, var(--reader-primary, #171717) 10%, transparent)",
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
            className="group flex size-7 sm:size-8 items-center justify-center rounded-full transition-all duration-200 cursor-pointer border border-[color-mix(in_srgb,var(--reader-border)_45%,_transparent)]"
            style={{
              color: "var(--reader-destructive, #dc2626)",
              background:
                "color-mix(in srgb, var(--reader-card-bg, rgba(255,255,255,0.9)) 35%, transparent)",
            }}
            title="停止"
          >
            <Square className="size-3.5 transition-transform duration-150 group-hover:scale-110" />
          </button>

          {onNext && (
            <button
              type="button"
              onClick={onNext}
              className="group flex size-7 sm:size-8 items-center justify-center rounded-full transition-all duration-200 cursor-pointer border border-[color-mix(in_srgb,var(--reader-border)_45%,_transparent)]"
              style={{
                color: "var(--reader-text, #09090b)",
                background:
                  "color-mix(in srgb, var(--reader-card-bg, rgba(255,255,255,0.9)) 35%, transparent)",
              }}
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
                className="group relative flex size-7 sm:size-8 items-center justify-center rounded-full transition-all duration-200 cursor-pointer border border-[color-mix(in_srgb,var(--reader-border)_45%,_transparent)]"
                style={{
                  color: autoScrollToActive
                    ? "var(--reader-primary, #171717)"
                    : "var(--reader-text, #09090b)",
                  background:
                    "color-mix(in srgb, var(--reader-card-bg, rgba(255,255,255,0.9)) 35%, transparent)",
                }}
                title={autoScrollToActive ? "关闭自动定位" : "开启自动定位"}
              >
                <LocateFixed
                  className={cn(
                    "size-4 transition-all duration-200",
                    autoScrollToActive && "scale-110"
                  )}
                />
                {autoScrollToActive && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[var(--reader-primary,#171717)]" />
                )}
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
                className="group relative flex size-7 sm:size-8 items-center justify-center rounded-full transition-all duration-200 cursor-pointer border border-[color-mix(in_srgb,var(--reader-border)_45%,_transparent)]"
                style={{
                  color: ttsAutoNextChapter
                    ? "var(--reader-primary, #171717)"
                    : "var(--reader-text, #09090b)",
                  background:
                    "color-mix(in srgb, var(--reader-card-bg, rgba(255,255,255,0.9)) 35%, transparent)",
                }}
                title={ttsAutoNextChapter ? "关闭自动续章" : "开启自动续章"}
              >
                <ListEnd
                  className={cn(
                    "size-4 transition-all duration-200",
                    ttsAutoNextChapter && "scale-110"
                  )}
                />
                {ttsAutoNextChapter && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[var(--reader-primary,#171717)]" />
                )}
              </button>
            </>
          )}

          {onOpenImmersiveView && (
            <>
              <div
                className="w-px h-5 mx-0.5 hidden sm:block"
                style={{ background: "var(--reader-border)" }}
              />
              <button
                type="button"
                onClick={handleOpenImmersiveView}
                className="group flex size-7 sm:size-8 items-center justify-center rounded-full transition-all duration-200 cursor-pointer border border-[color-mix(in_srgb,var(--reader-border)_45%,_transparent)]"
                style={{
                  color: "var(--reader-text, #09090b)",
                  background:
                    "color-mix(in srgb, var(--reader-card-bg, rgba(255,255,255,0.9)) 35%, transparent)",
                }}
                title="沉浸朗读"
              >
                <BookOpen className="size-4 transition-transform duration-150 group-hover:scale-110" />
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
                className="group flex size-7 sm:size-8 items-center justify-center rounded-full transition-all duration-200 cursor-pointer border border-[color-mix(in_srgb,var(--reader-border)_45%,_transparent)]"
                style={{
                  color: "var(--reader-text, #09090b)",
                  background:
                    "color-mix(in srgb, var(--reader-card-bg, rgba(255,255,255,0.9)) 35%, transparent)",
                }}
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
          "group animate-reader-surface relative flex size-10 sm:size-11 items-center justify-center rounded-full cursor-pointer overflow-hidden",
          "transition-all duration-300 ease-out",
          "border",
          "active:scale-95",
          isExpanded && "rotate-180"
        )}
        style={{
          background:
            "color-mix(in srgb, var(--reader-card-bg, rgba(255,255,255,0.95)) 88%, white 12%)",
          borderColor:
            "color-mix(in srgb, var(--reader-text, #171717) 10%, transparent)",
          boxShadow:
            "0 18px 32px -24px color-mix(in srgb, var(--reader-text, #171717) 35%, transparent)",
          color: "var(--reader-text, #171717)",
        }}
        title="朗读控制"
      >
        <div
          className="absolute inset-0 rounded-full transition-opacity duration-300 opacity-0 group-hover:opacity-100"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in srgb, white 30%, transparent) 0%, transparent 100%)",
          }}
        />

        {!isExpanded && (
          <span
            className="absolute inset-x-2 bottom-1 h-0.5 rounded-full"
            style={{
              background:
                "color-mix(in srgb, var(--reader-text, #171717) 10%, transparent)",
            }}
          >
            <span
              className="block h-full rounded-full transition-all duration-300"
              style={{
                width: `${clampedProgress * 100}%`,
                background: "var(--reader-primary, #171717)",
              }}
            />
          </span>
        )}

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
            style={{ background: "var(--reader-primary, #171717)" }}
          />
        )}
      </button>
    </div>
  );
}
