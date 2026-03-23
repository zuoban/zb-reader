"use client";

import { useMemo } from "react";
import {
  ArrowLeft,
  BookOpen,
  Maximize,
  Minimize,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Square,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { VoiceSelector } from "@/components/reader/VoiceSelector";
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
  onToggle: () => void;
  onStop: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onSelectedBrowserVoiceIdChange: (voiceId: string) => void;
  onTtsRateChange: (value: number) => void;
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
  ttsPlaybackProgress: _ttsPlaybackProgress,
  progress,
  readingDuration,
  ttsRate,
  selectedBrowserVoiceId,
  browserVoices,
  ttsAutoNextChapter: _ttsAutoNextChapter,
  autoScrollToActive: _autoScrollToActive,
  isFullscreen,
  onBackToReader,
  onToggle,
  onStop,
  onPrev,
  onNext,
  onSelectedBrowserVoiceIdChange,
  onTtsRateChange,
  onToggleAutoNextChapter: _onToggleAutoNextChapter,
  onToggleAutoScrollToActive: _onToggleAutoScrollToActive,
  onToggleFullscreen,
}: FullscreenTtsViewProps) {
  const { activeVoiceLabel, voiceGroups, selectedVoiceValue } = useMemo(() => {
    if (browserVoices.length === 0) {
      return {
        activeVoiceLabel: "默认语音",
        voiceGroups: [{ label: "暂无可用语音", voices: [{ value: "__empty__", label: "暂无可用语音", disabled: true }] }],
        selectedVoiceValue: "__empty__",
      };
    }

    // 按语言分组并排序
    const grouped = new Map<string, typeof browserVoices>();
    browserVoices.forEach((voice) => {
      const lang = voice.lang.startsWith("zh") ? "中文" : voice.lang.startsWith("en") ? "英文" : "其他";
      if (!grouped.has(lang)) grouped.set(lang, []);
      grouped.get(lang)!.push(voice);
    });

    // 优先级排序：中文 > 英文 > 其他
    const sortedGroups = Array.from(grouped.entries())
      .sort(([a], [b]) => {
        const order = { "中文": 0, "英文": 1, "其他": 2 };
        return (order[a as keyof typeof order] ?? 2) - (order[b as keyof typeof order] ?? 2);
      })
      .map(([label, voices]) => ({
        label,
        voices: voices.map((v) => ({ value: v.id, label: v.name, disabled: false })),
      }));

    const activeLabel = browserVoices.find((v) => v.id === selectedBrowserVoiceId)?.name ?? "默认语音";
    const selectedValue = browserVoices.some((v) => v.id === selectedBrowserVoiceId)
      ? selectedBrowserVoiceId
      : browserVoices[0]?.id ?? "__empty__";

    return { activeVoiceLabel: activeLabel, voiceGroups: sortedGroups, selectedVoiceValue: selectedValue };
  }, [browserVoices, selectedBrowserVoiceId]);

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

          <div className="min-w-0 flex-1" />

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
          </div>
        </header>

        <main className="flex min-h-0 flex-1 flex-col justify-center py-6 sm:py-8">
          <div className="mx-auto flex w-full max-w-sm flex-col items-center text-center">
            <div className="relative z-10 mb-6 flex h-52 w-40 items-center justify-center overflow-hidden rounded-[28px] border border-white/12 bg-white/8 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.8)] backdrop-blur-md sm:h-60 sm:w-44">
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
            </div>
          </div>

          <section className="mx-auto mt-8 w-full max-w-2xl rounded-[28px] border border-white/10 bg-white/8 p-5 backdrop-blur-xl shadow-[0_16px_48px_-28px_rgba(0,0,0,0.75)] sm:p-6">
            <div className="mb-5 space-y-4 rounded-[24px] border border-white/10 bg-black/10 p-4 backdrop-blur-md">
              <div className="flex items-center gap-1.5 text-xs text-white/55">
                <Volume2 className="size-3.5" />
                <span>{statusText}</span>
              </div>

              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 sm:items-start">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-white/62">语音</p>
                  <VoiceSelector
                    value={selectedVoiceValue}
                    groups={voiceGroups}
                    activeLabel={activeVoiceLabel}
                    onChange={(value) => {
                      if (value === "__empty__") return;
                      onSelectedBrowserVoiceIdChange(value);
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-xs text-white/62">
                    <p className="font-medium">语速</p>
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/88">
                      {ttsRate.toFixed(1)}x
                    </span>
                  </div>
                  <div className="relative flex h-11 items-center">
                    <div className="absolute inset-x-0 h-1.5 rounded-full bg-white/12">
                      <div
                        className="h-full rounded-full bg-white"
                        style={{ width: `${((ttsRate - 1) / (2 - 1)) * 100}%` }}
                      />
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={2}
                      step={0.1}
                      value={ttsRate}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      onChange={(e) => onTtsRateChange(Number(e.target.value))}
                    />
                    <div
                      className="pointer-events-none absolute h-5 w-5 rounded-full border-2 border-white bg-[#171319]"
                      style={{ left: `calc(${((ttsRate - 1) / (2 - 1)) * 100}% - 10px)` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <p className="min-h-28 text-left text-[15px] leading-8 text-white/88 sm:text-base sm:leading-8">
              {paragraphText || "正在准备朗读内容，马上为你定位到当前段落。"}
            </p>
          </section>
        </main>

        <footer className="mx-auto flex w-full max-w-2xl items-center justify-between gap-2 rounded-[32px] border border-white/12 bg-black/20 px-3 py-3 backdrop-blur-2xl shadow-[0_24px_80px_-28px_rgba(0,0,0,0.85)] sm:px-4">
          <div className="flex items-center gap-1 text-xs text-white/62">
            <span>{(overallProgress * 100).toFixed(1)}%</span>
            {readingDuration && readingDuration > 0 && (
              <span className="hidden sm:inline"> · {formatDuration(readingDuration)}</span>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onPrev}
              className="size-10 rounded-full border border-white/12 bg-white/8 text-white hover:bg-white/14 cursor-pointer sm:size-11"
              aria-label="上一段"
            >
              <SkipBack className="size-4 sm:size-5" />
            </Button>
            <Button
              type="button"
              onClick={onToggle}
              className="size-12 rounded-full bg-white text-black shadow-[0_16px_40px_-16px_rgba(255,255,255,0.7)] hover:bg-white/92 cursor-pointer sm:size-14"
              aria-label={isSpeaking && !isPaused ? "暂停朗读" : "开始朗读"}
            >
              {isSpeaking && !isPaused ? <Pause className="size-5 sm:size-6" /> : <Play className="size-5 ml-0.5 sm:size-6" />}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onNext}
              className="size-10 rounded-full border border-white/12 bg-white/8 text-white hover:bg-white/14 cursor-pointer sm:size-11"
              aria-label="下一段"
            >
              <SkipForward className="size-4 sm:size-5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onStop}
              className="size-10 rounded-full border border-red-400/20 bg-red-500/10 text-red-100 hover:bg-red-500/18 cursor-pointer sm:size-11"
              aria-label="停止朗读"
            >
              <Square className="size-4 sm:size-4.5" />
            </Button>
          </div>

          <Button
            type="button"
            variant="ghost"
            onClick={onBackToReader}
            className="min-w-16 gap-1.5 rounded-full border border-white/12 bg-white/8 px-3 text-sm text-white hover:bg-white/14 cursor-pointer sm:min-w-20 sm:px-4"
          >
            <BookOpen className="size-4" />
            <span className="hidden sm:inline">看原文</span>
          </Button>
        </footer>
      </div>
    </div>
  );
}
