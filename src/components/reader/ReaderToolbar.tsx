"use client";

import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Settings,
  List,
  StickyNote,
  Volume2,
  Pause,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ReaderToolbarProps {
  visible: boolean;
  title: string;
  currentPage?: number;
  totalPages?: number;
  progress: number; // 0-1
  isBookmarked: boolean;
  onBack: () => void;
  onToggleToc: () => void;
  onToggleBookmark: () => void;
  onToggleSettings: () => void;
  onToggleNotes: () => void;
  onToggleTts: () => void;
  isSpeaking: boolean;
  onProgressChange: (progress: number) => void;
}

export function ReaderToolbar({
  visible,
  title,
  currentPage,
  totalPages,
  progress,
  isBookmarked,
  onBack,
  onToggleToc,
  onToggleBookmark,
  onToggleSettings,
  onToggleNotes,
  onToggleTts,
  isSpeaking,
  onProgressChange,
}: ReaderToolbarProps) {
  return (
    <TooltipProvider>
      {/* Top toolbar */}
      <div
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-out ${
          visible
            ? "translate-y-0 opacity-100"
            : "-translate-y-full opacity-0"
        }`}
        style={{
          background: "rgba(var(--card-bg-rgb, 255, 255, 255), 0.92)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          borderBottom: "1px solid rgba(var(--border-rgb, 226, 232, 240), 0.6)",
          boxShadow: visible
            ? "0 4px 24px -2px rgba(0, 0, 0, 0.08), 0 2px 8px -1px rgba(0, 0, 0, 0.04)"
            : "none",
        }}
      >
        <div className="flex items-center justify-between h-14 px-2">
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onBack}
                  className="cursor-pointer relative overflow-hidden group transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  <span className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/0 group-hover:from-primary/10 group-hover:via-primary/5 group-hover:to-primary/0 transition-all duration-300" />
                  <ArrowLeft className="size-5 relative z-10 transition-transform duration-200 group-hover:-translate-x-0.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>返回书架</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggleToc}
                  className="cursor-pointer relative overflow-hidden group transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  <span className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/0 group-hover:from-primary/10 group-hover:via-primary/5 group-hover:to-primary/0 transition-all duration-300" />
                  <List className="size-5 relative z-10 transition-transform duration-200 group-hover:scale-110" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>目录</TooltipContent>
            </Tooltip>
          </div>

          <h1 className="flex-1 mx-3 text-sm font-semibold text-center truncate text-foreground px-4 py-1 rounded-lg bg-muted/30">
            {title}
          </h1>

          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggleBookmark}
                  className={`cursor-pointer relative overflow-hidden group transition-all duration-200 hover:scale-105 active:scale-95 ${
                    isBookmarked ? "text-primary" : ""
                  }`}
                >
                  <span className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/0 group-hover:from-primary/10 group-hover:via-primary/5 group-hover:to-primary/0 transition-all duration-300" />
                  {isBookmarked ? (
                    <BookmarkCheck className="size-5 relative z-10 transition-all duration-300 group-hover:scale-110" />
                  ) : (
                    <Bookmark className="size-5 relative z-10 transition-all duration-300 group-hover:scale-110" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isBookmarked ? "取消书签" : "添加书签"}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggleNotes}
                  className="cursor-pointer relative overflow-hidden group transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  <span className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/0 group-hover:from-primary/10 group-hover:via-primary/5 group-hover:to-primary/0 transition-all duration-300" />
                  <StickyNote className="size-5 relative z-10 transition-all duration-300 group-hover:rotate-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>笔记</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggleTts}
                  className={`cursor-pointer relative overflow-hidden group transition-all duration-200 hover:scale-105 active:scale-95 ${
                    isSpeaking ? "text-primary" : ""
                  }`}
                >
                  <span className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/0 group-hover:from-primary/10 group-hover:via-primary/5 group-hover:to-primary/0 transition-all duration-300" />
                  {isSpeaking ? (
                    <Pause className="size-5 relative z-10 transition-all duration-300 group-hover:scale-110" />
                  ) : (
                    <Volume2 className="size-5 relative z-10 transition-all duration-300 group-hover:scale-110" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isSpeaking ? "暂停朗读" : "开始朗读"}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggleSettings}
                  className="cursor-pointer relative overflow-hidden group transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  <span className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/0 group-hover:from-primary/10 group-hover:via-primary/5 group-hover:to-primary/0 transition-all duration-300" />
                  <Settings className="size-5 relative z-10 transition-all duration-300 group-hover:rotate-45" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>设置</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Bottom toolbar */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ease-out ${
          visible
            ? "translate-y-0 opacity-100"
            : "translate-y-full opacity-0"
        }`}
        style={{
          background: "rgba(var(--card-bg-rgb, 255, 255, 255), 0.92)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          borderTop: "1px solid rgba(var(--border-rgb, 226, 232, 240), 0.6)",
          boxShadow: visible
            ? "0 -4px 24px -2px rgba(0, 0, 0, 0.08), 0 -2px 8px -1px rgba(0, 0, 0, 0.04)"
            : "none",
        }}
      >
        <div className="flex items-center gap-4 px-4 py-3">
          <div className="text-xs font-semibold text-foreground whitespace-nowrap min-w-[3.5rem] text-center px-2.5 py-1 rounded-md bg-primary/10">
            {Math.round(progress * 100)}%
          </div>

          <div className="flex-1 relative group/slider">
            <div className="absolute inset-0 h-full bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary/40 via-primary/60 to-primary/40 transition-all duration-150"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <Slider
              className="relative z-10"
              value={[progress * 100]}
              min={0}
              max={100}
              step={0.1}
              onValueChange={(value) => onProgressChange(value[0] / 100)}
            />
          </div>

          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap min-w-[5rem] text-right">
            {currentPage !== undefined && totalPages !== undefined
              ? `${currentPage} / ${totalPages}`
              : ""}
          </span>
        </div>

        {/* Keyboard shortcuts hint */}
        <div className="flex items-center justify-center gap-6 pb-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <kbd className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-medium rounded border bg-muted">
              <ChevronLeft className="h-3 w-3" />
            </kbd>
            <span>上一页</span>
          </div>
          <div className="flex items-center gap-1.5">
            <kbd className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-medium rounded border bg-muted">
              <ChevronRight className="h-3 w-3" />
            </kbd>
            <span>下一页</span>
          </div>
          <div className="flex items-center gap-1.5">
            <kbd className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-medium rounded border bg-muted">
              Esc
            </kbd>
            <span>返回</span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
