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

import { useBookData, useTts, useReaderUI, useNavigation, useAnnotation } from "./providers";

interface ReaderToolbarProps {
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
  rightContent,
}: ReaderToolbarProps) {
  const { book } = useBookData();
  const { isSpeaking, isTtsViewOpen, handleToggleTts } = useTts();
  const { 
    toolbarVisible, 
    isFullscreen, 
    toggleFullscreen, 
    openToc, 
    setSettingsOpen 
  } = useReaderUI();
  const {
    handleBack,
    handlePrevPage,
    handleNextPage,
    handlePrevChapter,
    handleNextChapter,
    hasPrevChapter,
    hasNextChapter,
    handleProgressChange: _handleProgressChange,
    progress,
  } = useNavigation();
  const { isCurrentBookmarked, handleToggleBookmark } = useAnnotation();

  return (
    <TooltipProvider>
      {/* 顶部导航栏 */}
      <div
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-in-out",
          toolbarVisible && !isSpeaking && !isTtsViewOpen ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
        )}
      >
        <div className="grid h-14 grid-cols-[auto_minmax(0,1fr)_auto] items-center border-b border-[color-mix(in_srgb,var(--reader-text)_5%,transparent)] bg-[var(--reader-bg)]/95 px-4 backdrop-blur-md">
          {/* 左侧：返回 */}
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            <ToolbarButton onClick={handleBack} tooltip="返回书架">
              <ArrowLeft className="size-5" />
            </ToolbarButton>
            <div className="h-5 w-px bg-[var(--reader-text)]/10 mx-1 sm:mx-2" />
            <ToolbarButton onClick={openToc} tooltip="目录">
              <List className="size-5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={handleToggleBookmark}
              tooltip={isCurrentBookmarked ? "取消书签" : "添加书签"}
              isActive={isCurrentBookmarked}
            >
              {isCurrentBookmarked ? <BookmarkCheck className="size-5" /> : <Bookmark className="size-5" />}
            </ToolbarButton>
          </div>

          {/* 中间：书名 */}
          <div className="min-w-0 px-2 text-center sm:px-4">
            <h1
              className="truncate font-heading text-[13px] font-bold tracking-tight text-[var(--reader-text)] sm:text-sm"
              title={book?.title}
            >
              {book?.title}
            </h1>
          </div>

          {/* 右侧：功能 */}
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            <ToolbarButton
              onClick={handleToggleTts}
              tooltip={isSpeaking ? "停止" : "朗读"}
              isActive={isSpeaking}
            >
              {isSpeaking ? <Pause className="size-5" /> : <Volume2 className="size-5" />}
            </ToolbarButton>

            <ToolbarButton
              onClick={toggleFullscreen}
              tooltip={isFullscreen ? "退出全屏" : "全屏"}
              isActive={isFullscreen}
            >
              {isFullscreen ? <Minimize className="size-5" /> : <Maximize className="size-5" />}
            </ToolbarButton>

            <div className="h-5 w-px bg-[var(--reader-text)]/10 mx-1 sm:mx-2" />

            <ToolbarButton onClick={() => setSettingsOpen(true)} tooltip="阅读设置">
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
          toolbarVisible && !isSpeaking && !isTtsViewOpen ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
        )}
      >
        <div className="border-t border-[color-mix(in_srgb,var(--reader-text)_5%,transparent)] bg-[var(--reader-bg)]/95 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 backdrop-blur-md">
          <div className="mx-auto flex max-w-4xl items-center gap-3 sm:gap-6">
            
            {/* 导航：上一章 & 上一页 */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrevChapter}
                disabled={!hasPrevChapter}
                className="h-9 w-9 rounded-full hover:bg-[var(--reader-text)]/5"
                style={{ color: "var(--reader-text)" }}
              >
                <ChevronsLeft className="size-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrevPage}
                className="h-9 w-9 rounded-full hover:bg-[var(--reader-text)]/5"
                style={{ color: "var(--reader-text)" }}
              >
                <ChevronLeft className="size-5" />
              </Button>
            </div>

            {/* 中间：进度展示 */}
            <div className="flex flex-1 items-center gap-3 sm:gap-4 group">
              <div className="relative h-8 flex flex-1 items-center cursor-pointer">
                {/* Custom Track */}
                <div className="absolute inset-x-0 h-1.5 overflow-hidden rounded-full bg-[var(--reader-text)]/10">
                  <div 
                    className="h-full bg-[var(--reader-text)] transition-all duration-300 ease-out"
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
                {/* Invisible native range for interaction */}
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={progress}
                  onChange={(e) => {
                    const newProgress = parseFloat(e.target.value);
                    _handleProgressChange(newProgress);
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  aria-label="阅读进度"
                />
                {/* Custom Thumb */}
                <div
                  className="absolute h-4 w-4 rounded-full bg-[var(--reader-bg)] border-2 border-[var(--reader-text)] shadow-sm transition-transform duration-200 group-hover:scale-110 pointer-events-none"
                  style={{ left: `calc(${progress * 100}% - 8px)` }}
                />
              </div>
              <span className="min-w-[2.5rem] text-center text-[11px] font-bold tabular-nums text-[var(--reader-text)] opacity-60">
                {Math.round(progress * 100)}%
              </span>
            </div>

            {/* 导航：下一页 & 下一章 */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNextPage}
                className="h-9 w-9 rounded-full hover:bg-[var(--reader-text)]/5"
                style={{ color: "var(--reader-text)" }}
              >
                <ChevronRight className="size-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNextChapter}
                disabled={!hasNextChapter}
                className="h-9 w-9 rounded-full hover:bg-[var(--reader-text)]/5"
                style={{ color: "var(--reader-text)" }}
              >
                <ChevronsRight className="size-5" />
              </Button>
            </div>

          </div>
        </div>
      </div>
    </TooltipProvider>
  );
});
