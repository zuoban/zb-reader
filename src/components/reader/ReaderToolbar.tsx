"use client";

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
import { cn, formatDuration } from "@/lib/utils";

interface ReaderToolbarProps {
  visible: boolean;
  title: string;
  currentChapterTitle?: string;
  currentPage?: number;
  totalPages?: number;
  progress: number;
  readingDuration?: number;
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

function ToolbarButton({
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
          className={cn(
            "cursor-pointer h-9 w-9 sm:h-10 sm:w-10 rounded-full transition-colors duration-200",
            "hover:bg-[color-mix(in_srgb,var(--reader-primary)_8%,transparent)] hover:text-[var(--reader-primary)]",
            isActive &&
              "bg-[color-mix(in_srgb,var(--reader-primary)_10%,transparent)] text-[var(--reader-primary)]",
            className
          )}
          style={{ color: "var(--reader-text)" }}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs hidden sm:block">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

export function ReaderToolbar({
  visible,
  title,
  currentChapterTitle,
  currentPage: _currentPage,
  totalPages: _totalPages,
  progress,
  readingDuration,
  isBookmarked,
  isFullscreen,
  onBack,
  onToggleToc,
  onToggleBookmark,
  onToggleSettings,
  onToggleTts,
  onToggleFullscreen,
  isSpeaking,
  onProgressChange: _onProgressChange,
  onPrevPage: _onPrevPage,
  onNextPage: _onNextPage,
  onPrevChapter,
  onNextChapter,
  hasPrevChapter,
  hasNextChapter,
  rightContent,
}: ReaderToolbarProps) {
  const toolbarSurface =
    "linear-gradient(180deg, color-mix(in srgb, var(--reader-card-bg) 82%, white 18%) 0%, color-mix(in srgb, var(--reader-card-bg) 94%, transparent) 100%)";
  const toolbarBorder = "color-mix(in srgb, var(--reader-text) 9%, transparent)";
  const toolbarShadow =
    "0 18px 40px -30px color-mix(in srgb, var(--reader-text) 35%, transparent)";
  const showChapterMeta = currentChapterTitle && currentChapterTitle !== title;

  return (
    <TooltipProvider>
      <div
        className={cn(
          "pointer-events-none fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-out",
          visible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
        )}
      >
        <div className="mx-auto max-w-5xl px-3 pt-3 sm:px-5 sm:pt-5">
          <div
            className="pointer-events-auto rounded-[24px] border backdrop-blur-2xl"
            style={{
              background: toolbarSurface,
              borderColor: toolbarBorder,
              boxShadow: toolbarShadow,
            }}
          >
            <div className="flex items-center gap-2 px-2.5 py-2 sm:px-3 sm:py-2.5">
              <div className="flex items-center gap-1">
                <ToolbarButton onClick={onBack} tooltip="返回书架">
                  <ArrowLeft className="size-[18px] sm:size-[19px]" />
                </ToolbarButton>
                <ToolbarButton onClick={onToggleToc} tooltip="目录">
                  <List className="size-[18px] sm:size-[19px]" />
                </ToolbarButton>
              </div>

              <div className="min-w-0 flex-1 px-1 text-center">
                <h1
                  className="truncate text-[13px] font-semibold sm:text-sm"
                  style={{ color: "var(--reader-text)" }}
                >
                  {title}
                </h1>
                {showChapterMeta ? (
                  <p
                    className="mt-0.5 truncate text-[11px] sm:text-xs"
                    style={{ color: "var(--reader-muted-text)" }}
                  >
                    {currentChapterTitle}
                  </p>
                ) : null}
              </div>

              <div className="flex items-center gap-1">
                <ToolbarButton
                  onClick={onToggleBookmark}
                  tooltip={isBookmarked ? "取消书签" : "添加书签"}
                  isActive={isBookmarked}
                >
                  {isBookmarked ? (
                    <BookmarkCheck className="size-[18px] sm:size-[19px]" />
                  ) : (
                    <Bookmark className="size-[18px] sm:size-[19px]" />
                  )}
                </ToolbarButton>

                <ToolbarButton
                  onClick={onToggleTts}
                  tooltip={isSpeaking ? "暂停朗读" : "开始朗读"}
                  isActive={isSpeaking}
                >
                  {isSpeaking ? (
                    <Pause className="size-[18px] sm:size-[19px]" />
                  ) : (
                    <Volume2 className="size-[18px] sm:size-[19px]" />
                  )}
                </ToolbarButton>

                <ToolbarButton
                  onClick={onToggleFullscreen}
                  tooltip={isFullscreen ? "退出全屏" : "全屏阅读"}
                  isActive={isFullscreen}
                >
                  {isFullscreen ? (
                    <Minimize className="size-[18px] sm:size-[19px]" />
                  ) : (
                    <Maximize className="size-[18px] sm:size-[19px]" />
                  )}
                </ToolbarButton>

                <ToolbarButton onClick={onToggleSettings} tooltip="设置">
                  <Settings className="size-[18px] sm:size-[19px]" />
                </ToolbarButton>

                {rightContent}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "pointer-events-none fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ease-out",
          visible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
        )}
      >
        <div className="mx-auto max-w-5xl px-3 pb-3 sm:px-5 sm:pb-5">
          <div
            className="pointer-events-auto relative overflow-hidden rounded-[24px] border backdrop-blur-2xl"
            style={{
              background: toolbarSurface,
              borderColor: toolbarBorder,
              boxShadow: toolbarShadow,
            }}
          >
            <div className="flex items-center gap-2 px-3 py-3 sm:gap-3 sm:px-4 sm:py-3.5">
              {onPrevChapter && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onPrevChapter}
                  disabled={!hasPrevChapter}
                  className={cn(
                    "shrink-0 cursor-pointer h-9 w-9 rounded-full transition-colors duration-200 sm:h-10 sm:w-10",
                    "hover:bg-[color-mix(in_srgb,var(--reader-primary)_8%,transparent)]",
                    !hasPrevChapter &&
                      "opacity-30 cursor-not-allowed hover:bg-transparent"
                  )}
                  style={{ color: "var(--reader-text)" }}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3 text-[11px] sm:text-xs">
                  <span
                    className="min-w-0 flex-1 truncate"
                    style={{ color: "var(--reader-text)" }}
                  >
                    {currentChapterTitle || "阅读进度"}
                  </span>
                  <div className="flex shrink-0 items-center gap-3">
                    {readingDuration !== undefined && readingDuration > 0 && (
                      <span style={{ color: "var(--reader-muted-text)" }}>
                        已读 {formatDuration(readingDuration)}
                      </span>
                    )}
                    <span
                      className="tabular-nums font-medium"
                      style={{ color: "var(--reader-primary)" }}
                    >
                      {(progress * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div
                  className="mt-2 h-1.5 w-full overflow-hidden rounded-full"
                  style={{
                    background:
                      "color-mix(in srgb, var(--reader-text) 10%, transparent)",
                  }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${progress * 100}%`,
                      background: "var(--reader-primary)",
                    }}
                  />
                </div>
              </div>

              {onNextChapter && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onNextChapter}
                  disabled={!hasNextChapter}
                  className={cn(
                    "shrink-0 cursor-pointer h-9 w-9 rounded-full transition-colors duration-200 sm:h-10 sm:w-10",
                    "hover:bg-[color-mix(in_srgb,var(--reader-primary)_8%,transparent)]",
                    !hasNextChapter &&
                      "opacity-30 cursor-not-allowed hover:bg-transparent"
                  )}
                  style={{ color: "var(--reader-text)" }}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
