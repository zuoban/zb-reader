"use client";

import { memo } from "react";

import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Settings,
  List,
  Volume2,
  Pause,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Maximize,
  Minimize,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ReaderToolbarProps {
  visible: boolean;
  title: string;
  currentPage?: number;
  totalPages?: number;
  progress: number;
  isBookmarked: boolean;
  isFullscreen: boolean;
  onBack: () => void;
  onToggleToc: () => void;
  onToggleBookmark: () => void;
  onToggleSettings: () => void;
  onToggleTts: () => void;
  onToggleFullscreen: () => void;
  isSpeaking: boolean;
  onProgressChange: (progress: number) => void;
  onPrevPage?: () => void;
  onNextPage?: () => void;
  onPrevChapter?: () => void;
  onNextChapter?: () => void;
  hasPrevChapter?: boolean;
  hasNextChapter?: boolean;
  rightContent?: React.ReactNode;
}

const ToolbarButton = memo(function ToolbarButton({
  children,
  onClick,
  tooltip,
  isActive = false,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  tooltip: string;
  isActive?: boolean;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClick}
          aria-label={tooltip}
          className={cn(
            "h-8 w-8 cursor-pointer rounded-full transition-all duration-300",
            isActive
              ? "bg-[var(--reader-text)] text-[var(--reader-card-bg)]"
              : "text-[var(--reader-text)]/60 hover:bg-[var(--reader-text)]/5 hover:text-[var(--reader-text)]",
            className
          )}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        sideOffset={4}
        hideArrow={true}
        className="rounded-full border-[color-mix(in_srgb,var(--reader-text)_15%,transparent)] bg-[var(--reader-bg)]/95 px-3 py-1 text-[10px] font-bold tracking-tight text-[var(--reader-text)] shadow-lg backdrop-blur-md"
      >
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
});

export const ReaderToolbar = memo(function ReaderToolbar({
  visible,
  title,
  isBookmarked,
  isFullscreen,
  progress,
  onBack,
  onToggleToc,
  onToggleBookmark,
  onToggleSettings,
  onToggleTts,
  onToggleFullscreen,
  isSpeaking,
  onProgressChange: _onProgressChange,
  onPrevPage,
  onNextPage,
  onPrevChapter,
  onNextChapter,
  hasPrevChapter,
  hasNextChapter,
  rightContent,
}: ReaderToolbarProps) {
  return (
    <TooltipProvider>
      {/* 顶部导航栏 */}
      <div
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-in-out",
          visible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-[color-mix(in_srgb,var(--reader-text)_5%,transparent)] bg-[var(--reader-bg)]/95 px-4 backdrop-blur-md">
          {/* 左侧：返回 */}
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            <ToolbarButton onClick={onBack} tooltip="返回书架">
              <ArrowLeft className="size-5" />
            </ToolbarButton>
            <div className="h-6 w-px bg-[var(--reader-text)]/10 mx-0.5 sm:mx-2" />
            <ToolbarButton onClick={onToggleToc} tooltip="目录">
              <List className="size-5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={onToggleBookmark}
              tooltip={isBookmarked ? "取消书签" : "添加书签"}
              isActive={isBookmarked}
            >
              {isBookmarked ? <BookmarkCheck className="size-5" /> : <Bookmark className="size-5" />}
            </ToolbarButton>
          </div>

          {/* 中间：书名 */}
          <div className="absolute left-1/2 -translate-x-1/2 max-w-[30%] sm:max-w-[50%] text-center">
            <h1 className="truncate font-heading text-xs sm:text-sm font-bold tracking-tight text-[var(--reader-text)] uppercase">
              {title}
            </h1>
          </div>

          {/* 右侧：功能 */}
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            <ToolbarButton
              onClick={onToggleTts}
              tooltip={isSpeaking ? "停止" : "朗读"}
              isActive={isSpeaking}
            >
              {isSpeaking ? <Pause className="size-5" /> : <Volume2 className="size-5" />}
            </ToolbarButton>

            <ToolbarButton
              onClick={onToggleFullscreen}
              tooltip={isFullscreen ? "退出全屏" : "全屏"}
              isActive={isFullscreen}
            >
              {isFullscreen ? <Minimize className="size-5" /> : <Maximize className="size-5" />}
            </ToolbarButton>

            <div className="h-6 w-px bg-[var(--reader-text)]/10 mx-0.5 sm:mx-2" />


            <ToolbarButton onClick={onToggleSettings} tooltip="阅读设置">
              <Settings className="size-5" />
            </ToolbarButton>

            {rightContent}
          </div>
        </div>
      </div>

      {/* 底部进度与导航控制 */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 transition-all duration-500 ease-in-out",
          visible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
        )}
      >
        <div className="border-t border-[color-mix(in_srgb,var(--reader-text)_5%,transparent)] bg-[var(--reader-bg)]/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur-md">
          <div className="mx-auto flex max-w-4xl items-center gap-3 sm:gap-6">
            {/* 左侧：章节/页面导航 */}
            <div className="flex items-center gap-0.5 sm:gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={onPrevChapter}
                disabled={!hasPrevChapter}
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-full hover:bg-[var(--reader-text)]/5"
                style={{ color: "var(--reader-text)" }}
              >
                <ChevronsLeft className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onPrevPage}
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-full hover:bg-[var(--reader-text)]/5"
                style={{ color: "var(--reader-text)" }}
              >
                <ChevronLeft className="size-4" />
              </Button>
            </div>

            {/* 中间：进度展示 (Read-only) */}
            <div className="flex flex-1 items-center gap-2 sm:gap-4">
              <span className="min-w-[2rem] sm:min-w-[2.5rem] text-right text-[9px] sm:text-[10px] font-bold tracking-widest text-[var(--reader-text)] opacity-40">
                {Math.round(progress * 100)}%
              </span>
              <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-[var(--reader-text)]/10">
                <div 
                  className="h-full bg-[var(--reader-text)] transition-all duration-500 ease-out"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
            </div>

            {/* 右侧：章节/页面导航 */}
            <div className="flex items-center gap-0.5 sm:gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={onNextPage}
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-full hover:bg-[var(--reader-text)]/5"
                style={{ color: "var(--reader-text)" }}
              >
                <ChevronRight className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onNextChapter}
                disabled={!hasNextChapter}
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-full hover:bg-[var(--reader-text)]/5"
                style={{ color: "var(--reader-text)" }}
              >
                <ChevronsRight className="size-4" />
              </Button>
            </div>

          </div>
        </div>
      </div>
    </TooltipProvider>
  );
});
