"use client";

import { useState, useCallback } from "react";
import {
  Maximize,
  Minimize,
  Settings,
  SkipBack,
  SkipForward,
  Square,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BookCoverImage } from "@/components/ui/book-cover-image";
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
  const statusLabel = isSpeaking && !isPaused ? "朗读中" : isPaused ? "已暂停" : "准备朗读";

  return (
    <div
      className={cn(
        "fixed inset-0 z-[70] transition-all duration-300 ease-out",
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      )}
      aria-hidden={!open}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-14%,rgba(111,150,196,0.24),transparent_31%),radial-gradient(circle_at_16%_76%,rgba(88,124,161,0.13),transparent_25%),radial-gradient(circle_at_86%_20%,rgba(180,199,224,0.1),transparent_24%),linear-gradient(180deg,#242c37_0%,#121923_46%,#070b11_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),transparent_20%,transparent_74%,rgba(60,84,112,0.12))]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_32%,rgba(0,0,0,0.34)_100%)]" />
      <div className="animate-reader-breathe absolute left-1/2 top-0 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(139,172,211,0.14)_0%,transparent_70%)] blur-3xl" />

      <div className="relative flex h-full flex-col gap-4 px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-[calc(env(safe-area-inset-top)+12px)] text-white sm:gap-6 sm:px-6">
        <header className="mx-auto grid w-full max-w-3xl grid-cols-[auto_1fr_auto] items-center gap-3">
          <div className="flex items-center">
            {onToggleFullscreen && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onToggleFullscreen}
                className="tts-immersive-control size-10 cursor-pointer rounded-full text-white/84 hover:-translate-y-0.5"
                aria-label={isFullscreen ? "退出全屏" : "进入全屏"}
              >
                {isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
              </Button>
            )}
          </div>

          <div className="flex min-w-0 items-center justify-center gap-3 sm:justify-start">
            <div className="tts-immersive-control relative hidden h-14 w-10 shrink-0 overflow-hidden rounded-[10px] sm:flex">
              {book.cover ? (
                <BookCoverImage
                  bookId={book.id}
                  alt={book.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-white/8 text-[10px] font-bold text-white/58">
                  ZB
                </span>
              )}
            </div>
            <div className="min-w-0 text-center sm:text-left">
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/45">
                沉浸朗读
              </p>
              <h1 className="truncate text-base font-semibold tracking-tight text-white/95 sm:text-lg">
                {book.title}
              </h1>
              <p className="mt-0.5 truncate text-xs text-white/58 sm:text-sm">
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
              className="tts-immersive-control size-10 cursor-pointer rounded-full text-white/84 hover:-translate-y-0.5"
              aria-label="返回原文"
            >
              <X className="size-4" />
            </Button>
          </div>
        </header>

        <main className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col justify-start">
          <section className="tts-immersive-panel animate-reader-fade-up flex h-[min(64vh,620px)] min-h-0 flex-col rounded-[24px] p-5 text-left sm:h-[min(70vh,760px)] sm:rounded-[28px] sm:p-7">
            <div className="relative flex min-h-0 flex-1 flex-col">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-white/66">
                  {statusLabel}
                </span>
                <span className="text-[11px] uppercase tracking-[0.18em] text-white/42">
                  {currentChapterTitle || "当前章节"}
                </span>
              </div>
              <div className="mt-5 flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto pr-1 [scrollbar-color:rgba(255,255,255,0.22)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border [&::-webkit-scrollbar-thumb]:border-transparent [&::-webkit-scrollbar-thumb]:bg-[linear-gradient(180deg,rgba(255,255,255,0.26),rgba(255,255,255,0.12))] [&::-webkit-scrollbar-thumb]:bg-clip-padding">
                <div className="w-full text-center">
                  {activeIsCodeBlock ? (
                    <pre className="mx-auto max-w-full rounded-xl bg-white/5 p-4 text-left font-mono text-[13px] leading-relaxed tracking-[0.01em] text-white/90 [text-shadow:0_1px_14px_rgba(0,0,0,0.42)] sm:text-[14px] sm:leading-loose whitespace-pre-wrap break-words">
                      {paragraphText || "正在准备朗读内容..."}
                    </pre>
                  ) : (
                    <p className="text-[20px] font-medium leading-relaxed tracking-[0.02em] text-white [text-shadow:0_2px_20px_rgba(0,0,0,0.5)] sm:text-[24px] sm:leading-relaxed lg:text-[28px]">
                      {paragraphText || "正在准备朗读内容..."}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>
        </main>

        <footer className="tts-immersive-panel animate-reader-fade-up mx-auto w-full max-w-3xl rounded-[22px] p-3 sm:rounded-[26px] sm:p-4" style={{ animationDelay: "70ms" }}>
          <div className="mb-3 flex items-center gap-3">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,rgba(191,219,254,0.95),rgba(125,173,226,0.72))] shadow-[0_0_18px_rgba(147,197,253,0.34)] transition-[width] duration-300 ease-out"
                style={{ width: `${overallProgress * 100}%` }}
              />
            </div>
            <span className="w-12 shrink-0 text-right text-xs font-medium tabular-nums text-white/68">
              {(overallProgress * 100).toFixed(1)}%
            </span>
          </div>

          <div className="grid items-center gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-4">
            <div className="hidden sm:block" />

            <div className="flex items-center justify-center gap-2 sm:gap-2.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onPrev}
                className="tts-immersive-control size-10 cursor-pointer rounded-full text-white/84 hover:text-white sm:size-11"
                aria-label="上一章"
              >
                <SkipBack className="size-4" />
              </Button>
              <Button
                type="button"
                onClick={onToggle}
                data-playing={isSpeaking && !isPaused ? "true" : "false"}
                className="tts-record-button relative size-16 cursor-pointer overflow-visible rounded-full border border-sky-100/34 bg-slate-950 p-0 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_18px_42px_-16px_rgba(96,165,250,0.52),0_10px_28px_-14px_rgba(0,0,0,0.82)] transition-all hover:scale-[1.02] active:scale-[0.98] sm:size-[4.5rem]"
                aria-label={isSpeaking && !isPaused ? "暂停朗读" : "开始朗读"}
              >
                <span className="tts-record-disc absolute inset-[3px] rounded-full">
                  <span className="tts-record-label absolute inset-[27%] overflow-hidden rounded-full border border-white/14 bg-slate-800">
                    {book.cover ? (
                      <BookCoverImage
                        bookId={book.id}
                        alt=""
                        className="h-full w-full scale-110 object-cover"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center bg-[linear-gradient(145deg,rgba(125,173,226,0.92),rgba(30,41,59,0.94))] text-[10px] font-bold text-white/82">
                        TTS
                      </span>
                    )}
                  </span>
                  <span className="absolute left-1/2 top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/26 bg-slate-950 shadow-[0_1px_0_rgba(255,255,255,0.18)_inset]" />
                </span>
                <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-full bg-[radial-gradient(circle_at_50%_38%,rgba(255,255,255,0.18),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(0,0,0,0.16))]" />
                <svg
                  className="tts-record-tonearm pointer-events-none absolute inset-0 z-10 size-full overflow-visible"
                  viewBox="0 0 80 80"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient id="tts-tonearm-metal" x1="66" x2="43" y1="12" y2="47">
                      <stop offset="0" stopColor="rgba(255,255,255,0.98)" />
                      <stop offset="0.34" stopColor="rgba(226,232,240,0.96)" />
                      <stop offset="0.72" stopColor="rgba(148,163,184,0.94)" />
                      <stop offset="1" stopColor="rgba(71,85,105,0.94)" />
                    </linearGradient>
                    <linearGradient id="tts-tonearm-head" x1="35" x2="48" y1="45" y2="57">
                      <stop offset="0" stopColor="rgba(241,245,249,0.96)" />
                      <stop offset="1" stopColor="rgba(100,116,139,0.92)" />
                    </linearGradient>
                    <filter id="tts-tonearm-shadow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="2.4" stdDeviation="2" floodColor="rgba(0,0,0,0.58)" />
                    </filter>
                  </defs>
                  <g filter="url(#tts-tonearm-shadow)">
                    <circle cx="64" cy="13" r="7.2" fill="rgba(15,23,42,0.96)" stroke="rgba(226,232,240,0.58)" strokeWidth="1.4" />
                    <circle cx="64" cy="13" r="4.4" fill="rgba(51,65,85,0.94)" stroke="rgba(255,255,255,0.34)" strokeWidth="1" />
                    <circle cx="64" cy="13" r="1.8" fill="rgba(226,232,240,0.92)" />
                  </g>
                  <g className="tts-record-tonearm-arm" filter="url(#tts-tonearm-shadow)">
                    <path
                      d="M61.2 18.4 C57.2 28.2 51.3 38.5 43.7 48.8"
                      fill="none"
                      stroke="url(#tts-tonearm-metal)"
                      strokeLinecap="round"
                      strokeWidth="4.4"
                    />
                    <path
                      d="M62.4 19.2 C58.3 29 52.2 39.1 45.1 48.7"
                      fill="none"
                      stroke="rgba(255,255,255,0.52)"
                      strokeLinecap="round"
                      strokeWidth="1.2"
                    />
                    <path
                      d="M39.8 46.4 L34.3 53 L40.3 57.1 L46.9 49.3 Z"
                      fill="url(#tts-tonearm-head)"
                      stroke="rgba(15,23,42,0.7)"
                      strokeLinejoin="round"
                      strokeWidth="1.2"
                    />
                    <path
                      d="M37.2 54.5 L34.6 59.6"
                      stroke="rgba(226,232,240,0.88)"
                      strokeLinecap="round"
                      strokeWidth="1.35"
                    />
                    <path
                      d="M42.1 50.4 L38.1 55.5"
                      stroke="rgba(255,255,255,0.28)"
                      strokeLinecap="round"
                      strokeWidth="1"
                    />
                  </g>
                </svg>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onNext}
                className="tts-immersive-control size-10 cursor-pointer rounded-full text-white/84 hover:text-white sm:size-11"
                aria-label="下一章"
              >
                <SkipForward className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onStop}
                className="size-10 cursor-pointer rounded-full border border-red-300/20 bg-[linear-gradient(180deg,rgba(255,120,120,0.2),rgba(255,120,120,0.08))] text-red-100/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] hover:bg-[linear-gradient(180deg,rgba(255,120,120,0.26),rgba(255,120,120,0.12))] hover:text-red-50 sm:size-11"
                aria-label="停止朗读"
              >
                <Square className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setSettingsOpen(true)}
                className="tts-immersive-control size-10 cursor-pointer rounded-full text-white/84 hover:text-white sm:size-11"
                aria-label="朗读设置"
              >
                <Settings className="size-4" />
              </Button>
            </div>

            <div className="hidden sm:block" />
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
