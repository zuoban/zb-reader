"use client";

import { useMemo } from "react";
import {
  ArrowLeft,
  BookOpen,
  ListEnd,
  LocateFixed,
  Maximize,
  Minimize,
  Pause,
  Play,
  Settings2,
  SkipBack,
  SkipForward,
  Square,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  ttsAutoNextChapter: boolean;
  autoScrollToActive: boolean;
  isFullscreen: boolean;
  onBackToReader: () => void;
  onOpenSettings: () => void;
  onToggle: () => void;
  onStop: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onToggleAutoNextChapter: (value: boolean) => void;
  onToggleAutoScrollToActive: (value: boolean) => void;
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
  ttsAutoNextChapter,
  autoScrollToActive,
  isFullscreen,
  onBackToReader,
  onOpenSettings,
  onToggle,
  onStop,
  onPrev,
  onNext,
  onToggleAutoNextChapter,
  onToggleAutoScrollToActive,
  onToggleFullscreen,
}: FullscreenTtsViewProps) {
  const activeVoiceLabel = useMemo(() => {
    return browserVoices.find((voice) => voice.id === selectedBrowserVoiceId)?.name ?? "默认语音";
  }, [browserVoices, selectedBrowserVoiceId]);

  const currentProgress = clampProgress(ttsPlaybackProgress > 0 ? ttsPlaybackProgress : progress);
  const overallProgress = clampProgress(progress);
  const paragraphText = activeParagraph?.trim();
  const statusText = isSpeaking ? (isPaused ? "已暂停" : "朗读中") : "准备朗读";

  return (
    <div
      className={cn(
        "fixed inset-0 z-[70] transition-all duration-300 ease-out",
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      )}
      aria-hidden={!open}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.18),_transparent_34%),linear-gradient(180deg,_#24161f_0%,_#171319_35%,_#0b0f17_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),transparent_20%,transparent_78%,rgba(255,255,255,0.04))]" />

      <div className="relative flex h-full flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-[calc(env(safe-area-inset-top)+16px)] text-white sm:px-6">
        <header className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onBackToReader}
            className="size-11 rounded-full border border-white/12 bg-white/8 text-white backdrop-blur-md hover:bg-white/14 cursor-pointer"
            aria-label="返回阅读页"
          >
            <ArrowLeft className="size-5" />
          </Button>

          <div className="min-w-0 flex-1 text-center">
            <p className="text-xs font-medium tracking-[0.28em] text-white/55">{statusText}</p>
            <h2 className="mt-1 truncate text-sm font-medium text-white/92">
              {currentChapterTitle || book.title}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {onToggleFullscreen && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onToggleFullscreen}
                className="size-11 rounded-full border border-white/12 bg-white/8 text-white backdrop-blur-md hover:bg-white/14 cursor-pointer"
                aria-label={isFullscreen ? "退出全屏" : "进入全屏"}
              >
                {isFullscreen ? <Minimize className="size-4.5" /> : <Maximize className="size-4.5" />}
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onOpenSettings}
              className="size-11 rounded-full border border-white/12 bg-white/8 text-white backdrop-blur-md hover:bg-white/14 cursor-pointer"
              aria-label="打开朗读设置"
            >
              <Settings2 className="size-5" />
            </Button>
          </div>
        </header>

        <main className="flex min-h-0 flex-1 flex-col justify-center py-6 sm:py-8">
          <div className="mx-auto flex w-full max-w-sm flex-col items-center text-center">
            <div className="relative mb-6 flex h-52 w-40 items-center justify-center overflow-hidden rounded-[28px] border border-white/12 bg-white/8 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.8)] backdrop-blur-md sm:h-60 sm:w-44">
              {book.cover ? (
                <img
                  src={book.cover}
                  alt={book.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0.04))] px-5 text-center">
                  <BookOpen className="mb-3 size-8 text-white/80" />
                  <span className="line-clamp-3 text-sm font-medium text-white/90">{book.title}</span>
                </div>
              )}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/40 to-transparent" />
            </div>

            <div className="space-y-2">
              <h1 className="line-clamp-2 text-2xl font-semibold tracking-tight text-white sm:text-[1.75rem]">
                {book.title}
              </h1>
              <p className="text-sm text-white/65">{book.author || "未知作者"}</p>
              <p className="line-clamp-2 text-sm text-white/82">
                {currentChapterTitle || "正在定位当前章节"}
              </p>
            </div>
          </div>

          <section className="mx-auto mt-8 w-full max-w-2xl rounded-[28px] border border-white/10 bg-white/8 p-5 backdrop-blur-xl shadow-[0_16px_48px_-28px_rgba(0,0,0,0.75)] sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3 text-xs text-white/55">
              <span className="inline-flex items-center gap-1.5">
                <Volume2 className="size-3.5" />
                {statusText}
              </span>
              <span>{activeVoiceLabel} · {ttsRate.toFixed(1)}x</span>
            </div>

            <p className="min-h-28 text-left text-[15px] leading-8 text-white/88 sm:text-base sm:leading-8">
              {paragraphText || "正在准备朗读内容，马上为你定位到当前段落。"}
            </p>
          </section>
        </main>

        <footer className="mx-auto w-full max-w-2xl rounded-[32px] border border-white/12 bg-black/20 px-4 py-4 backdrop-blur-2xl shadow-[0_24px_80px_-28px_rgba(0,0,0,0.85)] sm:px-5">
          <div className="mb-4 space-y-2">
            <div className="flex items-center justify-between gap-3 text-xs text-white/62">
              <span>段落进度 {(currentProgress * 100).toFixed(0)}%</span>
              <span>
                全书 {(overallProgress * 100).toFixed(2)}%
                {readingDuration && readingDuration > 0 ? ` · 已读 ${formatDuration(readingDuration)}` : ""}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/12">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#f7e7ff_0%,#d0d8ff_55%,#86c9ff_100%)] transition-all duration-500 ease-out"
                style={{ width: `${currentProgress * 100}%` }}
              />
            </div>
          </div>

          <div className="mb-4 flex items-center justify-center gap-3 sm:gap-4">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onPrev}
              className="size-11 rounded-full border border-white/12 bg-white/8 text-white hover:bg-white/14 cursor-pointer"
              aria-label="上一段"
            >
              <SkipBack className="size-5" />
            </Button>
            <Button
              type="button"
              onClick={onToggle}
              className="size-14 rounded-full bg-white text-black shadow-[0_16px_40px_-16px_rgba(255,255,255,0.7)] hover:bg-white/92 cursor-pointer"
              aria-label={isSpeaking && !isPaused ? "暂停朗读" : "开始朗读"}
            >
              {isSpeaking && !isPaused ? <Pause className="size-6" /> : <Play className="size-6 ml-0.5" />}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onNext}
              className="size-11 rounded-full border border-white/12 bg-white/8 text-white hover:bg-white/14 cursor-pointer"
              aria-label="下一段"
            >
              <SkipForward className="size-5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onStop}
              className="size-11 rounded-full border border-red-400/20 bg-red-500/10 text-red-100 hover:bg-red-500/18 cursor-pointer"
              aria-label="停止朗读"
            >
              <Square className="size-4.5" />
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => onToggleAutoScrollToActive(!autoScrollToActive)}
              className={cn(
                "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm transition-colors cursor-pointer",
                autoScrollToActive
                  ? "border-white/20 bg-white text-black"
                  : "border-white/12 bg-white/8 text-white hover:bg-white/14"
              )}
            >
              <LocateFixed className="size-4" />
              自动定位
            </button>
            <button
              type="button"
              onClick={() => onToggleAutoNextChapter(!ttsAutoNextChapter)}
              className={cn(
                "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm transition-colors cursor-pointer",
                ttsAutoNextChapter
                  ? "border-white/20 bg-white text-black"
                  : "border-white/12 bg-white/8 text-white hover:bg-white/14"
              )}
            >
              <ListEnd className="size-4" />
              自动续章
            </button>
            <button
              type="button"
              onClick={onBackToReader}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/12 bg-white/8 px-4 text-sm text-white transition-colors hover:bg-white/14 cursor-pointer"
            >
              <BookOpen className="size-4" />
              看原文
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
