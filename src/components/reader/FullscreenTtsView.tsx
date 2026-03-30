"use client";

import { useState, useCallback } from "react";
import {
  BookOpen,
  Maximize,
  Minimize,
  Pause,
  Play,
  Settings,
  SkipBack,
  SkipForward,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TtsSettingsDialog } from "@/components/reader/TtsSettingsDialog";
import { cn, formatDuration } from "@/lib/utils";
import type { Book } from "@/lib/db/schema";
import type { BrowserVoiceOption } from "@/lib/tts";

interface FullscreenTtsViewProps {
  open: boolean;
  book: Book;
  currentChapterTitle?: string;
  activeParagraph?: string;
  isSpeaking: boolean;
  isPaused: boolean;
  ttsPlaybackProgress: number;
  progress: number;
  readingDuration?: number;
  ttsRate: number;
  selectedBrowserVoiceId: string;
  browserVoices: BrowserVoiceOption[];
  isFullscreen: boolean;
  onBackToReader: () => void;
  onToggle: () => void;
  onStop: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onSelectedBrowserVoiceIdChange: (voiceId: string) => void;
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
  isSpeaking,
  isPaused,
  ttsPlaybackProgress,
  progress,
  readingDuration,
  ttsRate,
  selectedBrowserVoiceId,
  browserVoices,
  isFullscreen,
  onBackToReader,
  onToggle,
  onStop,
  onPrev,
  onNext,
  onSelectedBrowserVoiceIdChange,
  onTtsRateChange,
  onToggleFullscreen,
}: FullscreenTtsViewProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleSettingsOpenChange = useCallback((open: boolean) => {
    setSettingsOpen(open);
  }, []);

  const overallProgress = clampProgress(progress);
  const _paragraphProgress = clampProgress(ttsPlaybackProgress);
  const paragraphText = activeParagraph?.trim();
  const statusLabel = isSpeaking && !isPaused ? "朗读中" : isPaused ? "已暂停" : "准备朗读";

  return (
    <div
      className={cn(
        "fixed inset-0 z-[70] transition-all duration-300 ease-out",
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      )}
      aria-hidden={!open}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(228,240,255,0.52),transparent_30%),radial-gradient(circle_at_18%_78%,rgba(170,212,255,0.16),transparent_24%),radial-gradient(circle_at_86%_18%,rgba(255,255,255,0.18),transparent_24%),linear-gradient(180deg,#2a2f3d_0%,#171b25_38%,#0c0f16_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.16),transparent_18%,transparent_78%,rgba(255,255,255,0.08))]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_45%,rgba(0,0,0,0.18)_100%)]" />
      <div className="animate-reader-breathe absolute left-1/2 top-0 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(191,219,254,0.2)_0%,transparent_68%)] blur-3xl" />

      <div className="relative flex h-full flex-col gap-4 px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-[calc(env(safe-area-inset-top)+12px)] text-white sm:gap-6 sm:px-6">
        <header className="mx-auto grid w-full max-w-3xl grid-cols-[auto_1fr_auto] items-center gap-3">
          <div className="flex items-center">
            {onToggleFullscreen && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onToggleFullscreen}
                className="size-10 rounded-full border border-white/24 bg-[linear-gradient(180deg,rgba(255,255,255,0.22),rgba(255,255,255,0.09))] text-white/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.34),inset_0_-1px_0_rgba(255,255,255,0.06),0_10px_26px_-14px_rgba(0,0,0,0.7)] backdrop-blur-2xl hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.26),rgba(255,255,255,0.11))] cursor-pointer"
                aria-label={isFullscreen ? "退出全屏" : "进入全屏"}
              >
                {isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
              </Button>
            )}
          </div>

          <div className="min-w-0 text-center">
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/45">
              沉浸朗读
            </p>
            <h1 className="truncate text-base font-semibold tracking-tight text-white/95 sm:text-lg">
              {book.title}
            </h1>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setSettingsOpen(true)}
              className="size-10 rounded-full border border-white/24 bg-[linear-gradient(180deg,rgba(255,255,255,0.22),rgba(255,255,255,0.09))] text-white/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.34),inset_0_-1px_0_rgba(255,255,255,0.06),0_10px_26px_-14px_rgba(0,0,0,0.7)] backdrop-blur-2xl hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.26),rgba(255,255,255,0.11))] cursor-pointer"
              aria-label="朗读设置"
            >
              <Settings className="size-4" />
            </Button>
          </div>
        </header>

        <main className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col justify-start">
          <section className="animate-reader-fade-up flex h-[min(64vh,620px)] min-h-0 flex-col rounded-[24px] border border-white/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.22),rgba(255,255,255,0.09))] p-5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.32),inset_0_-1px_0_rgba(255,255,255,0.05),0_28px_60px_-38px_rgba(0,0,0,0.95)] backdrop-blur-3xl sm:h-[min(70vh,760px)] sm:rounded-[28px] sm:p-7">
            <div className="relative flex min-h-0 flex-1 flex-col">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-full border border-white/14 bg-white/8 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-white/60">
                  {statusLabel}
                </span>
                <span className="text-[11px] uppercase tracking-[0.18em] text-white/50">
                  {currentChapterTitle || "当前章节"}
                </span>
              </div>
              <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-color:rgba(255,255,255,0.28)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border [&::-webkit-scrollbar-thumb]:border-transparent [&::-webkit-scrollbar-thumb]:bg-[linear-gradient(180deg,rgba(255,255,255,0.34),rgba(255,255,255,0.18))] [&::-webkit-scrollbar-thumb]:bg-clip-padding">
                <p className="text-[16px] font-normal leading-9 tracking-[0.01em] text-white/96 [text-shadow:0_1px_10px_rgba(0,0,0,0.18)] sm:text-[18px] sm:leading-[2.6rem]">
                  {paragraphText || "正在准备朗读内容，马上为你定位到当前段落。"}
                </p>
              </div>
            </div>
          </section>
        </main>

        <footer className="animate-reader-fade-up mx-auto w-full max-w-3xl rounded-[24px] border border-white/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.2),rgba(255,255,255,0.09))] px-3 py-2.5 backdrop-blur-3xl shadow-[inset_0_1px_0_rgba(255,255,255,0.3),inset_0_-1px_0_rgba(255,255,255,0.05),0_30px_60px_-30px_rgba(0,0,0,0.78)] sm:px-4 sm:py-3" style={{ animationDelay: "70ms" }}>
          <div className="flex items-start justify-between gap-2.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-12 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[12px] border border-white/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.22),rgba(255,255,255,0.09))] shadow-[inset_0_1px_0_rgba(255,255,255,0.26),inset_0_-1px_0_rgba(255,255,255,0.04)]">
                {book.cover ? (
                  <img
                    src={`/api/books/${book.id}/cover`}
                    alt={book.title}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <BookOpen className="size-5 text-white/70" />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-white/88 sm:text-sm">{book.author || "未知作者"}</p>
                <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-white/64 sm:text-xs">
                  <span>{statusLabel}</span>
                  <span className="text-white/24">/</span>
                  <span>{(overallProgress * 100).toFixed(1)}%</span>
                  {readingDuration && readingDuration > 0 && (
                    <>
                      <span className="text-white/24">/</span>
                      <span>{formatDuration(readingDuration)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              onClick={onBackToReader}
              className="shrink-0 gap-1 rounded-full border border-white/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.22),rgba(255,255,255,0.09))] px-2.5 py-2 text-[11px] text-white/84 shadow-[inset_0_1px_0_rgba(255,255,255,0.26),inset_0_-1px_0_rgba(255,255,255,0.04)] hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.26),rgba(255,255,255,0.11))] hover:text-white cursor-pointer sm:px-3 sm:text-xs"
            >
              <BookOpen className="size-3.5" />
              <span className="hidden sm:inline">原文</span>
            </Button>
          </div>

          <div className="mt-2.5 flex items-center justify-center gap-1.5 border-t border-white/10 pt-2.5 sm:mt-3 sm:pt-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onPrev}
              className="size-8 rounded-full border border-white/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.2),rgba(255,255,255,0.09))] text-white/86 shadow-[inset_0_1px_0_rgba(255,255,255,0.24),inset_0_-1px_0_rgba(255,255,255,0.04)] hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.24),rgba(255,255,255,0.11))] hover:text-white cursor-pointer sm:size-9"
              aria-label="上一段"
            >
              <SkipBack className="size-3.5 sm:size-4" />
            </Button>
            <Button
              type="button"
              onClick={onToggle}
              className="size-11 rounded-full border border-white/30 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(235,242,255,0.78))] text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_14px_32px_-10px_rgba(193,218,255,0.45),0_8px_24px_-12px_rgba(0,0,0,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer sm:size-13"
              aria-label={isSpeaking && !isPaused ? "暂停朗读" : "开始朗读"}
            >
              {isSpeaking && !isPaused ? <Pause className="size-5 sm:size-6" /> : <Play className="size-5 ml-0.5 sm:size-6" />}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onNext}
              className="size-8 rounded-full border border-white/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.2),rgba(255,255,255,0.09))] text-white/86 shadow-[inset_0_1px_0_rgba(255,255,255,0.24),inset_0_-1px_0_rgba(255,255,255,0.04)] hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.24),rgba(255,255,255,0.11))] hover:text-white cursor-pointer sm:size-9"
              aria-label="下一段"
            >
              <SkipForward className="size-3.5 sm:size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onStop}
              className="size-8 rounded-full border border-red-300/18 bg-[linear-gradient(180deg,rgba(255,120,120,0.2),rgba(255,120,120,0.08))] text-red-100/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] hover:bg-[linear-gradient(180deg,rgba(255,120,120,0.26),rgba(255,120,120,0.12))] hover:text-red-50 cursor-pointer sm:size-9"
              aria-label="停止朗读"
            >
              <Square className="size-3 sm:size-3.5" />
            </Button>
          </div>
        </footer>

        <TtsSettingsDialog
          open={settingsOpen}
          onOpenChange={handleSettingsOpenChange}
          ttsRate={ttsRate}
          selectedBrowserVoiceId={selectedBrowserVoiceId}
          browserVoices={browserVoices}
          onTtsRateChange={onTtsRateChange}
          onSelectedBrowserVoiceIdChange={onSelectedBrowserVoiceIdChange}
        />
      </div>
    </div>
  );
}
