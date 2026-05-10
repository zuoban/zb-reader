"use client";

import { useCallback, useState } from "react";
import { BookOpen, Pause, Play, Square, SkipBack, SkipForward, Maximize, Minimize, X } from "lucide-react";
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
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

function AudioWaveIndicator({ color }: { color?: string }) {
  return (
    <div className="flex items-center justify-center gap-1 h-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="w-0.5 h-2 rounded-full animate-audio-wave"
          style={{ animationDelay: `${i * 120}ms`, backgroundColor: color || "currentColor" }}
        />
      ))}
    </div>
  );
}

function TtsIcon({ color, children }: { color?: string; children: React.ReactNode }) {
  return (
    <span style={{
      color: color || "inherit",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center"
    }}>
      {children}
    </span>
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
  isFullscreen = false,
  onToggleFullscreen,
}: TtsFloatingControlProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleMainClick = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const handleOpenImmersiveView = useCallback(() => {
    onOpenImmersiveView?.();
    setIsExpanded(false);
  }, [onOpenImmersiveView]);

  const text = "#09090b";
  const textDark = "#d8dee7";
  const bg = "#f5f7fb";
  const bgDark = "#101419";
  const primary = "#18181b";
  const primaryDark = "#c9d7e8";
  const destructive = "#ef4444";
  const destructiveDark = "#f87171";

  return (
    <div
      className={cn(
        "fixed bottom-4 right-3 z-50 flex items-center gap-2",
        "transition-all duration-200",
        (hidden || !isSpeaking) && "pointer-events-none opacity-0 translate-y-1",
        !hidden && isSpeaking && "opacity-100 translate-y-0"
      )}
    >
      {isExpanded && (
        <div className="tts-panel flex items-center gap-1 rounded-xl px-1.5 py-1 shadow-md">
          {onPrev && (
            <TtsBtn variant="default" onClick={onPrev} ariaLabel="上一章">
              <TtsIcon color={text}>
                <SkipBack className="size-3.5" />
              </TtsIcon>
            </TtsBtn>
          )}

          <TtsBtn variant="primary" onClick={onToggle} ariaLabel={isPaused ? "播放" : "暂停"}>
            <TtsIcon color={text}>
              {isPaused ? <Play className="size-4 ml-0.5" /> : <Pause className="size-4" />}
            </TtsIcon>
          </TtsBtn>

          <TtsBtn variant="stop" onClick={onStop} ariaLabel="停止">
            <TtsIcon color={destructive}>
              <Square className="size-3.5" />
            </TtsIcon>
          </TtsBtn>

          {onNext && (
            <TtsBtn variant="default" onClick={onNext} ariaLabel="下一章">
              <TtsIcon color={text}>
                <SkipForward className="size-3.5" />
              </TtsIcon>
            </TtsBtn>
          )}

          {onOpenImmersiveView && (
            <>
              <div className="w-px h-4 mx-0.5 hidden sm:block bg-black/10" />
              <TtsBtn variant="default" onClick={handleOpenImmersiveView} ariaLabel="沉浸朗读">
                <TtsIcon color={text}>
                  <BookOpen className="size-4" />
                </TtsIcon>
              </TtsBtn>
            </>
          )}

          {onToggleFullscreen && (
            <>
              <div className="w-px h-4 mx-0.5 hidden sm:block bg-black/10" />
              <TtsBtn variant="default" onClick={onToggleFullscreen} ariaLabel={isFullscreen ? "退出全屏" : "全屏"}>
                <TtsIcon color={text}>
                  {isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
                </TtsIcon>
              </TtsBtn>
            </>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={handleMainClick}
        aria-label="朗读控制"
        className={cn(
          "tts-btn flex size-10 items-center justify-center rounded-lg cursor-pointer transition-all duration-200 active:scale-95 shadow-md",
          isExpanded && "rotate-180"
        )}
        title="朗读控制"
      >
        {!isExpanded && isSpeaking && <AudioWaveIndicator color="currentColor" />}
        {!isExpanded && !isSpeaking && (
          <TtsIcon>
            <Play className="size-4 ml-0.5" />
          </TtsIcon>
        )}
        {isExpanded && (
          <TtsIcon>
            <X className="size-4" />
          </TtsIcon>
        )}
      </button>
    </div>
  );
}

function TtsBtn({
  children,
  onClick,
  ariaLabel,
  variant = "default",
}: {
  children: React.ReactNode;
  onClick: () => void;
  ariaLabel: string;
  variant?: "default" | "primary" | "stop";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        "flex size-7 items-center justify-center rounded-md transition-all duration-150 cursor-pointer hover:scale-105 active:scale-95",
        variant === "primary" && "tts-btn--primary",
        variant === "stop" && "tts-btn--stop",
      )}
      title={ariaLabel}
    >
      {children}
    </button>
  );
}
