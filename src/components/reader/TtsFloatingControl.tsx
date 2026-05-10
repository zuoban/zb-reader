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

function AudioWaveIndicator({ isPaused }: { isPaused?: boolean }) {
  return (
    <div className="flex items-center justify-center gap-[3px] h-5">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className={cn(
            "w-[3px] rounded-full transition-all duration-300",
            isPaused ? "h-1.5 bg-current/60" : "h-3 bg-current animate-audio-wave-float"
          )}
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  );
}

function TtsIcon({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center justify-center", className)}>
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

  return (
    <div
      className={cn(
        "fixed bottom-5 right-4 z-50 flex items-center gap-2",
        "transition-all duration-300 ease-out",
        (hidden || !isSpeaking) && "pointer-events-none opacity-0 translate-y-4",
        !hidden && isSpeaking && "opacity-100 translate-y-0"
      )}
    >
      {isExpanded && (
        <div className="tts-panel flex items-center gap-1 rounded-2xl px-2 py-1.5 shadow-lg">
          {onPrev && (
            <TtsBtn variant="secondary" onClick={onPrev} ariaLabel="上一章">
              <TtsIcon>
                <SkipBack className="size-4" />
              </TtsIcon>
            </TtsBtn>
          )}

          <TtsBtn variant="primary" onClick={onToggle} ariaLabel={isPaused ? "播放" : "暂停"}>
            <TtsIcon>
              {isPaused ? <Play className="size-4 ml-0.5" /> : <Pause className="size-4" />}
            </TtsIcon>
          </TtsBtn>

          <TtsBtn variant="destructive" onClick={onStop} ariaLabel="停止">
            <TtsIcon>
              <Square className="size-3.5" />
            </TtsIcon>
          </TtsBtn>

          {onNext && (
            <TtsBtn variant="secondary" onClick={onNext} ariaLabel="下一章">
              <TtsIcon>
                <SkipForward className="size-4" />
              </TtsIcon>
            </TtsBtn>
          )}

          {(onOpenImmersiveView || onToggleFullscreen) && (
            <div className="w-px h-5 mx-0.5 bg-foreground/10" />
          )}

          {onOpenImmersiveView && (
            <TtsBtn variant="secondary" onClick={handleOpenImmersiveView} ariaLabel="沉浸朗读">
              <TtsIcon>
                <BookOpen className="size-4" />
              </TtsIcon>
            </TtsBtn>
          )}

          {onToggleFullscreen && (
            <TtsBtn variant="secondary" onClick={onToggleFullscreen} ariaLabel={isFullscreen ? "退出全屏" : "全屏"}>
              <TtsIcon>
                {isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
              </TtsIcon>
            </TtsBtn>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={handleMainClick}
        aria-label="朗读控制"
        className={cn(
          "tts-trigger flex size-11 items-center justify-center rounded-2xl cursor-pointer",
          "transition-all duration-300 ease-out",
          "hover:scale-105 active:scale-95 shadow-lg",
          isExpanded && "rotate-90"
        )}
        title="朗读控制"
      >
        {!isExpanded && isSpeaking && <AudioWaveIndicator isPaused={isPaused} />}
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
  variant = "secondary",
}: {
  children: React.ReactNode;
  onClick: () => void;
  ariaLabel: string;
  variant?: "primary" | "secondary" | "destructive";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        "flex size-9 items-center justify-center rounded-xl",
        "transition-all duration-200 ease-out",
        "cursor-pointer hover:scale-105 active:scale-95",
        variant === "primary" && "tts-btn--primary",
        variant === "secondary" && "tts-btn--secondary",
        variant === "destructive" && "tts-btn--destructive",
      )}
      title={ariaLabel}
    >
      {children}
    </button>
  );
}
