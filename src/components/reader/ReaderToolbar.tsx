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
  onToggleNotes: () => void;
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
            "cursor-pointer h-8 w-8 sm:h-9 sm:w-9 rounded-xl transition-colors duration-150",
            "hover:bg-[var(--reader-primary-light)] hover:text-[var(--reader-primary)]",
            isActive && "bg-[var(--reader-primary-light)] text-[var(--reader-primary)]",
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
  onToggleNotes,
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
  return (
    <TooltipProvider>
      <div
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-out",
          visible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
        )}
      >
        <div className="mx-auto max-w-4xl px-3 pt-3 sm:px-4 sm:pt-4">
          <div
            className={cn(
              "rounded-2xl border backdrop-blur-xl"
            )}
            style={{
              background: "var(--reader-card-bg)",
              borderColor: "var(--reader-border)",
              boxShadow: "0 4px 16px -4px var(--reader-shadow), 0 2px 8px -2px var(--reader-shadow)",
            }}
          >
          <div className="flex items-center justify-between h-12 sm:h-14 px-1 sm:px-2">
            <div className="flex items-center gap-0.5 sm:gap-1">
              <ToolbarButton onClick={onBack} tooltip="返回书架">
                <ArrowLeft className="size-[18px] sm:size-5" />
              </ToolbarButton>
              <ToolbarButton onClick={onToggleToc} tooltip="目录">
                <List className="size-[18px] sm:size-5" />
              </ToolbarButton>
            </div>

            <h1
              className="flex-1 mx-1.5 sm:mx-3 text-xs sm:text-sm font-medium text-center truncate max-w-[140px] sm:max-w-none"
              style={{ color: "var(--reader-text)" }}
            >
              {title}
            </h1>

            <div className="flex items-center gap-0.5 sm:gap-1">
              <ToolbarButton
                onClick={onToggleBookmark}
                tooltip={isBookmarked ? "取消书签" : "添加书签"}
                isActive={isBookmarked}
              >
                {isBookmarked ? (
                  <BookmarkCheck className="size-[18px] sm:size-5" />
                ) : (
                  <Bookmark className="size-[18px] sm:size-5" />
                )}
              </ToolbarButton>

              <ToolbarButton onClick={onToggleNotes} tooltip="笔记">
                <StickyNote className="size-[18px] sm:size-5" />
              </ToolbarButton>

              <ToolbarButton
                onClick={onToggleTts}
                tooltip={isSpeaking ? "暂停朗读" : "开始朗读"}
                isActive={isSpeaking}
              >
                {isSpeaking ? (
                  <Pause className="size-[18px] sm:size-5" />
                ) : (
                  <Volume2 className="size-[18px] sm:size-5" />
                )}
              </ToolbarButton>

              <ToolbarButton
                onClick={onToggleFullscreen}
                tooltip={isFullscreen ? "退出全屏" : "全屏阅读"}
                isActive={isFullscreen}
              >
                {isFullscreen ? (
                  <Minimize className="size-[18px] sm:size-5" />
                ) : (
                  <Maximize className="size-[18px] sm:size-5" />
                )}
              </ToolbarButton>

              <ToolbarButton onClick={onToggleSettings} tooltip="设置">
                <Settings className="size-[18px] sm:size-5" />
              </ToolbarButton>

              {/* Custom right content */}
              {rightContent}
            </div>
          </div>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ease-out",
          visible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
        )}
      >
        <div className="mx-auto max-w-4xl px-3 pb-3 sm:px-4 sm:pb-4">
          <div
            className="relative rounded-2xl border backdrop-blur-xl overflow-hidden"
            style={{
              background: "var(--reader-card-bg)",
              borderColor: "var(--reader-border)",
              boxShadow: "0 4px 16px -4px var(--reader-shadow), 0 2px 8px -2px var(--reader-shadow)",
            }}
          >
            {/* 进度条区域 */}
            <div className="px-4 pt-3 pb-2 sm:px-5 sm:pt-4 sm:pb-3">
              <div className="flex items-center gap-2 sm:gap-3">
                {/* 上一章按钮 */}
                {onPrevChapter && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onPrevChapter}
                    disabled={!hasPrevChapter}
                    className={cn(
                      "shrink-0 cursor-pointer h-9 w-9 sm:h-11 sm:w-11 rounded-xl sm:rounded-2xl transition-all duration-200",
                      "hover:bg-[var(--reader-primary-light,_rgba(23,23,23,0.1))] hover:scale-105 active:scale-95",
                      !hasPrevChapter && "opacity-30 cursor-not-allowed hover:bg-transparent hover:scale-100"
                    )}
                    style={{ color: "var(--reader-text, #171717)" }}
                  >
                    <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
                  </Button>
                )}

                {/* 进度条和百分比 */}
                <div className="flex-1 flex flex-col gap-2">
                  <div className="relative flex items-center justify-center">
                    <div className="absolute left-0 flex items-center gap-2 shrink-0">
                      {readingDuration !== undefined && readingDuration > 0 && (
                        <span className="text-xs font-normal" style={{ color: "var(--reader-muted-text, #737373)" }}>
                          已读 {formatDuration(readingDuration)}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-normal truncate max-w-[50%] text-center" style={{ color: "var(--reader-text, #171717)" }}>
                      {currentChapterTitle || "阅读进度"}
                    </span>
                    <div className="absolute right-0 flex items-center gap-2 shrink-0">
                      <span
                        className="text-xs font-normal tabular-nums"
                        style={{ color: "var(--reader-primary, #171717)" }}
                      >
                        {(progress * 100).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                  <div
                    className="relative w-full h-2.5 sm:h-3 rounded-full overflow-hidden"
                    style={{
                      background: "var(--reader-primary-light, rgba(23,23,23,0.1))",
                    }}
                  >
                    <div
                      className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out"
                      style={{
                        width: `${progress * 100}%`,
                        background: "linear-gradient(90deg, var(--reader-primary, #171717) 0%, color-mix(in srgb, var(--reader-primary, #171717) 70%, #666) 100%)",
                        boxShadow: "0 0 12px color-mix(in srgb, var(--reader-primary, #171717) 40%, transparent)",
                      }}
                    />
                  </div>
                </div>

                {/* 下一章按钮 */}
                {onNextChapter && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onNextChapter}
                    disabled={!hasNextChapter}
                    className={cn(
                      "shrink-0 cursor-pointer h-9 w-9 sm:h-11 sm:w-11 rounded-xl sm:rounded-2xl transition-all duration-200",
                      "hover:bg-[var(--reader-primary-light,_rgba(23,23,23,0.1))] hover:scale-105 active:scale-95",
                      !hasNextChapter && "opacity-30 cursor-not-allowed hover:bg-transparent hover:scale-100"
                    )}
                    style={{ color: "var(--reader-text, #171717)" }}
                  >
                    <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
                  </Button>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
