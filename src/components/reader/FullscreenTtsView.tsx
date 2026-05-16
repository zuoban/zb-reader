"use client";

import { useState, useCallback } from "react";
import {
  Maximize,
  Minimize,
  Pause,
  Play,
  Settings,
  SkipBack,
  SkipForward,
  Square,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TtsSettingsDialog } from "@/components/reader/TtsSettingsDialog";
import { cn } from "@/lib/utils";
import type { Book } from "@/lib/db/schema";
import type { BrowserVoiceOption } from "@/lib/tts";

interface FullscreenTtsViewProps {
  open: boolean;
  book: Book;
  currentChapterTitle?: string;
  activeHtml: string;
  activeParagraph?: string;
  activeIsCodeBlock?: boolean;
  isSpeaking: boolean;
  isPaused: boolean;
  progress: number;
  ttsRate: number;
  selectedTtsVoiceId: string;
  ttsVoices: BrowserVoiceOption[];
  isFullscreen: boolean;
  onBackToReader: () => void;
  onToggle: () => void;
  onStop: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onSelectedTtsVoiceIdChange: (voiceId: string) => void;
  onTtsRateChange: (value: number) => void;
  onToggleFullscreen?: () => void;
}

function clampProgress(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function FullscreenTtsView({
  open,
  book,
  currentChapterTitle,
  activeParagraph,
  activeIsCodeBlock,
  isSpeaking,
  isPaused,
  progress,
  ttsRate,
  selectedTtsVoiceId,
  ttsVoices,
  isFullscreen,
  onBackToReader,
  onToggle,
  onStop,
  onPrev,
  onNext,
  onSelectedTtsVoiceIdChange,
  onTtsRateChange,
  onToggleFullscreen,
}: FullscreenTtsViewProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleSettingsOpenChange = useCallback((open: boolean) => {
    setSettingsOpen(open);
  }, []);

  const overallProgress = clampProgress(progress);
  const paragraphText = activeParagraph?.trim();

  return (
    <div
      className={cn(
        "fixed inset-0 z-[70] transition-all duration-500 ease-in-out overflow-hidden",
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      )}
      aria-hidden={!open}
    >
      {/* Dynamic Aurora Background */}
      <div className="absolute inset-0 bg-[#070b11]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(111,150,196,0.18),transparent_50%)]" />
      
      <div className="absolute inset-0 overflow-hidden opacity-40 pointer-events-none">
        <div 
          className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-blue-500/10 blur-[120px]" 
          style={{ animation: 'aurora-1 20s infinite ease-in-out' }} 
        />
        <div 
          className="absolute top-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-indigo-500/10 blur-[100px]" 
          style={{ animation: 'aurora-2 25s infinite ease-in-out' }} 
        />
        <div 
          className="absolute -bottom-[10%] left-[20%] w-[50%] h-[50%] rounded-full bg-slate-400/10 blur-[110px]" 
          style={{ animation: 'aurora-3 22s infinite ease-in-out' }} 
        />
      </div>

      {/* Grain Texture Overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay bg-[url('data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E')]" />

      <div className="relative flex h-full flex-col gap-4 px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-[calc(env(safe-area-inset-top)+12px)] text-white sm:gap-6 sm:px-6">
        <header className="mx-auto grid w-full max-w-3xl grid-cols-[auto_1fr_auto] items-center gap-4">
          <div className="flex items-center">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setSettingsOpen(true)}
              className="size-11 cursor-pointer rounded-xl text-white/50 hover:text-white hover:bg-white/[0.08] transition-all"
              aria-label="朗读设置"
            >
              <Settings className="size-5" />
            </Button>
          </div>

          <div className="flex min-w-0 flex-1 items-center justify-center">
            <div className="min-w-0 text-center">
              <h1 className="truncate text-base font-semibold tracking-tight text-white/95 sm:text-lg font-heading">
                {book.title}
              </h1>
              <p className="mt-0.5 truncate text-xs font-medium text-white/40 tracking-wide uppercase sm:text-[11px]">
                {book.author || "未知作者"}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onBackToReader}
              className="size-11 cursor-pointer rounded-xl text-white/50 hover:text-white hover:bg-white/[0.08] transition-all"
              aria-label="返回原文"
            >
              <X className="size-5" />
            </Button>
          </div>
        </header>

        <main className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col overflow-hidden">
          <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden px-4 sm:px-6">
            <div className="relative flex min-h-0 flex-1 flex-col justify-center overflow-hidden">
              <div
                key={paragraphText}
                className="w-full overflow-y-auto scrollbar-premium text-left animate-reading-text-enter"
              >
                {activeIsCodeBlock ? (
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                    <pre className="relative w-full rounded-2xl bg-white/5 p-4 sm:p-6 text-left font-mono text-[13px] leading-relaxed tracking-normal text-white/80 border border-white/5 backdrop-blur-sm sm:text-[14px] sm:leading-loose overflow-x-auto whitespace-pre">
                      {paragraphText || "正在准备内容..."}
                    </pre>
                  </div>
                ) : (
                  <p className="text-lg sm:text-xl lg:text-2xl font-medium leading-relaxed tracking-normal text-white/90 sm:leading-[1.7] lg:leading-[1.65]">
                    {paragraphText || "正在准备朗读内容..."}
                  </p>
                )}
              </div>
            </div>
          </section>
        </main>

        <footer className="animate-reader-fade-up mx-auto w-full max-w-3xl rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 bg-[#0a0f1a]/80 border border-white/[0.08] backdrop-blur-2xl shadow-2xl" style={{ animationDelay: "100ms" }}>
          {/* Info Row: Chapter + Progress */}
          <div className="flex items-center justify-between gap-3 mb-8 sm:mb-10">
            <span className="flex-1 text-sm font-medium text-white/40 truncate font-heading text-center">
              {currentChapterTitle || "当前章节"}
            </span>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-white/30">
              {(overallProgress * 100).toFixed(0)}<span className="text-xs ml-0.5">%</span>
            </span>
          </div>

          {/* Controls Row */}
          <div className="flex items-center justify-center gap-8 sm:gap-12">
            {onToggleFullscreen && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onToggleFullscreen}
                className="size-10 cursor-pointer rounded-full text-white/25 hover:text-white/60 transition-all active:scale-90"
                aria-label={isFullscreen ? "退出全屏" : "进入全屏"}
              >
                {isFullscreen ? <Minimize className="size-5" /> : <Maximize className="size-5" />}
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onPrev}
              className="size-10 cursor-pointer rounded-full text-white/35 hover:text-white/70 transition-all active:scale-90"
              aria-label="上一章"
            >
              <SkipBack className="size-5" />
            </Button>

            {/* Central Playback */}
            <div className="relative">
              <Button
                type="button"
                onClick={onToggle}
                className="relative size-14 sm:size-16 cursor-pointer flex items-center justify-center rounded-full bg-white/[0.06] border border-white/[0.1] text-white transition-all hover:bg-white/[0.1] hover:border-white/[0.15] active:scale-95"
                aria-label={isSpeaking && !isPaused ? "暂停朗读" : "开始朗读"}
              >
                {isSpeaking && !isPaused ? (
                  <Pause className="size-6 sm:size-7 fill-current" />
                ) : (
                  <Play className="size-6 sm:size-7 fill-current ml-0.5" />
                )}
                
                {/* Progress Ring */}
                <svg className="absolute inset-0 size-full -rotate-90 pointer-events-none">
                  <circle
                    cx="50%"
                    cy="50%"
                    r="46%"
                    fill="none"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeDasharray="289%"
                    strokeDashoffset={`${289 - overallProgress * 289}%`}
                    className="opacity-15 transition-all duration-700 ease-out"
                  />
                </svg>
              </Button>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onNext}
              className="size-10 cursor-pointer rounded-full text-white/35 hover:text-white/70 transition-all active:scale-90"
              aria-label="下一章"
            >
              <SkipForward className="size-5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onStop}
              className="size-10 cursor-pointer rounded-full text-white/25 hover:text-white/50 transition-all active:scale-90"
              aria-label="停止朗读"
            >
              <Square className="size-5" />
            </Button>
          </div>
        </footer>

        <TtsSettingsDialog
          open={settingsOpen}
          onOpenChange={handleSettingsOpenChange}
          ttsRate={ttsRate}
          selectedTtsVoiceId={selectedTtsVoiceId}
          ttsVoices={ttsVoices}
          onTtsRateChange={onTtsRateChange}
          onSelectedTtsVoiceIdChange={onSelectedTtsVoiceIdChange}
        />
      </div>
    </div>
  );
}
