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
            {onToggleFullscreen && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onToggleFullscreen}
                className="tts-immersive-control size-10 cursor-pointer rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all"
                aria-label={isFullscreen ? "退出全屏" : "进入全屏"}
              >
                {isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
              </Button>
            )}
          </div>

          <div className="flex min-w-0 items-center justify-center gap-3.5">
            <div className="tts-immersive-control relative hidden h-12 w-9 shrink-0 overflow-hidden rounded-lg sm:flex border-white/10 shadow-lg">
              {book.cover ? (
                <BookCoverImage
                  bookId={book.id}
                  alt={book.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-white/5 text-[9px] font-bold text-white/40">
                  ZB
                </span>
              )}
            </div>
            <div className="min-w-0 text-center sm:text-left">
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
              className="tts-immersive-control size-10 cursor-pointer rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all"
              aria-label="返回原文"
            >
              <X className="size-4" />
            </Button>
          </div>
        </header>

        <main className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col justify-center">
          <section className="relative flex h-[min(64vh,620px)] min-h-0 flex-col rounded-[32px] sm:h-[min(70vh,760px)]">
            <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center p-8 sm:p-12">
              <div className="absolute top-0 flex flex-wrap items-center justify-center gap-3 opacity-40">
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50 truncate max-w-[300px]">
                  {currentChapterTitle || "当前章节"}
                </span>
              </div>
              
              <div 
                key={paragraphText}
                className="w-full text-center animate-reading-text-enter"
              >
                {activeIsCodeBlock ? (
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                    <pre className="relative mx-auto max-w-full rounded-2xl bg-white/5 p-6 text-left font-mono text-[13px] leading-relaxed tracking-normal text-white/80 border border-white/5 backdrop-blur-sm sm:text-[14px] sm:leading-loose whitespace-pre-wrap break-words">
                      {paragraphText || "正在准备内容..."}
                    </pre>
                  </div>
                ) : (
                  <p className="relative text-[22px] font-medium leading-[1.6] tracking-tight text-white/95 [text-shadow:0_4px_24px_rgba(0,0,0,0.5)] sm:text-[28px] sm:leading-[1.55] lg:text-[34px] px-4 max-w-2xl mx-auto">
                    {paragraphText || "正在准备朗读内容..."}
                  </p>
                )}
              </div>
            </div>
          </section>
        </main>

        <footer className="animate-reader-fade-up mx-auto w-full max-w-3xl rounded-[32px] p-6 sm:p-10 bg-white/[0.03] border border-white/5 backdrop-blur-2xl shadow-2xl" style={{ animationDelay: "70ms" }}>
          {/* Progress Row: Absolute side labels ensure the bar is perfectly centered */}
          <div className="relative flex items-center justify-center mb-10 h-6">
            <div className="absolute left-0 flex items-center">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/25 whitespace-nowrap">
                {statusLabel}
              </span>
            </div>
            
            <div className="w-full px-20 sm:px-24">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5 shadow-inner">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-400 to-indigo-400 shadow-[0_0_15px_rgba(129,140,248,0.5)] transition-[width] duration-700 ease-out"
                  style={{ width: `${overallProgress * 100}%` }}
                />
              </div>
            </div>

            <div className="absolute right-0 flex items-center">
              <span className="text-[11px] font-bold tabular-nums text-white/35 tracking-wider">
                {(overallProgress * 100).toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Controls Row: Absolute side buttons ensure the playback group is mathematically centered */}
          <div className="relative flex items-center justify-center min-h-[80px]">
            {/* Left: Settings */}
            <div className="absolute left-0">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setSettingsOpen(true)}
                className="size-12 cursor-pointer rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-all active:scale-90"
                aria-label="朗读设置"
              >
                <Settings className="size-5" />
              </Button>
            </div>

            {/* Center: Playback Controls (Mathematically Centered) */}
            <div className="flex items-center gap-6 sm:gap-14">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onPrev}
                className="size-12 cursor-pointer rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-all active:scale-90"
                aria-label="上一章"
              >
                <SkipBack className="size-6" />
              </Button>

              <Button
                type="button"
                onClick={onToggle}
                data-playing={isSpeaking && !isPaused ? "true" : "false"}
                className="tts-record-button relative size-20 cursor-pointer overflow-visible rounded-full border border-white/10 bg-slate-950 p-0 text-white shadow-2xl transition-all hover:scale-105 active:scale-95 sm:size-24"
                aria-label={isSpeaking && !isPaused ? "暂停朗读" : "开始朗读"}
              >
                <span className="tts-record-disc absolute inset-[4px] rounded-full">
                  <span className="tts-record-label absolute inset-[26%] overflow-hidden rounded-full border border-white/10 bg-slate-900 shadow-inner">
                    {book.cover ? (
                      <BookCoverImage
                        bookId={book.id}
                        alt=""
                        className="h-full w-full scale-110 object-cover opacity-80"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-700 to-slate-900 text-[10px] font-bold text-white/40">
                        TTS
                      </span>
                    )}
                  </span>
                  <span className="absolute left-1/2 top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-slate-950 shadow-lg" />
                </span>
                <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-full bg-gradient-to-b from-white/10 to-transparent" />
                
                <svg
                  className="tts-record-tonearm pointer-events-none absolute inset-0 z-10 size-full overflow-visible"
                  viewBox="0 0 80 80"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient id="tts-tonearm-metal" x1="66" x2="43" y1="12" y2="47">
                      <stop offset="0" stopColor="rgba(255,255,255,0.9)" />
                      <stop offset="1" stopColor="rgba(148,163,184,0.9)" />
                    </linearGradient>
                    <filter id="tts-tonearm-shadow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="rgba(0,0,0,0.6)" />
                    </filter>
                  </defs>
                  <g className="tts-record-tonearm-arm" filter="url(#tts-tonearm-shadow)">
                    <circle cx="64" cy="13" r="6" fill="#1e293b" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                    <path
                      d="M61 18 C57 28 51 38 43 48"
                      fill="none"
                      stroke="url(#tts-tonearm-metal)"
                      strokeLinecap="round"
                      strokeWidth="4"
                    />
                    <path
                      d="M38 46 L33 52 L39 56 L45 49 Z"
                      fill="#f1f5f9"
                      stroke="#0f172a"
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
                className="size-12 cursor-pointer rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-all active:scale-90"
                aria-label="下一章"
              >
                <SkipForward className="size-6" />
              </Button>
            </div>

            {/* Right: Stop (Fixed position) */}
            <div className="absolute right-0">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onStop}
                className="size-12 cursor-pointer rounded-full text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all active:scale-90"
                aria-label="停止朗读"
              >
                <Square className="size-5" />
              </Button>
            </div>
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
