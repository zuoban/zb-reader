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
            "cursor-pointer h-9 w-9 rounded-lg transition-colors",
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
  onPrevChapter,
  onNextChapter,
  hasPrevChapter,
  hasNextChapter,
  rightContent,
}: ReaderToolbarProps) {
  const showChapterMeta = currentChapterTitle && currentChapterTitle !== title;

  return (
    <TooltipProvider>
      {/* 顶部工具栏 */}
      <div
        className={cn(
          "pointer-events-none fixed top-0 left-0 right-0 z-50 transition-all duration-200",
          visible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
        )}
      >
        <div className="mx-auto max-w-3xl px-4 pt-3">
          <div
            className="pointer-events-auto flex items-center justify-between rounded-xl border px-3 py-2 backdrop-blur-md"
            style={{
              background: "color-mix(in srgb, var(--reader-card-bg) 90%, transparent)",
              borderColor: "var(--reader-border)",
            }}
          >
            {/* 左侧：返回和目录 */}
            <div className="flex items-center gap-1">
              <ToolbarButton onClick={onBack} tooltip="返回书架">
                <ArrowLeft className="size-[18px]" />
              </ToolbarButton>
              <ToolbarButton onClick={onToggleToc} tooltip="目录">
                <List className="size-[18px]" />
              </ToolbarButton>
            </div>

            {/* 中间：书名和章节 */}
            <div className="min-w-0 flex-1 px-2 text-center">
              <h1
                className="truncate text-sm font-medium"
                style={{ color: "var(--reader-text)" }}
              >
                {title}
              </h1>
              {showChapterMeta && (
                <p
                  className="truncate text-xs"
                  style={{ color: "var(--reader-muted-text)" }}
                >
                  {currentChapterTitle}
                </p>
              )}
            </div>

            {/* 右侧：操作按钮 */}
            <div className="flex items-center gap-1">
              <ToolbarButton
                onClick={onToggleBookmark}
                tooltip={isBookmarked ? "取消书签" : "添加书签"}
                isActive={isBookmarked}
              >
                {isBookmarked ? (
                  <BookmarkCheck className="size-[18px]" />
                ) : (
                  <Bookmark className="size-[18px]" />
                )}
              </ToolbarButton>

              <ToolbarButton
                onClick={onToggleTts}
                tooltip={isSpeaking ? "暂停朗读" : "开始朗读"}
                isActive={isSpeaking}
              >
                {isSpeaking ? (
                  <Pause className="size-[18px]" />
                ) : (
                  <Volume2 className="size-[18px]" />
                )}
              </ToolbarButton>

              <ToolbarButton
                onClick={onToggleFullscreen}
                tooltip={isFullscreen ? "退出全屏" : "全屏阅读"}
                isActive={isFullscreen}
              >
                {isFullscreen ? (
                  <Minimize className="size-[18px]" />
                ) : (
                  <Maximize className="size-[18px]" />
                )}
              </ToolbarButton>

              <ToolbarButton onClick={onToggleSettings} tooltip="设置">
                <Settings className="size-[18px]" />
              </ToolbarButton>

              {rightContent}
            </div>
          </div>
        </div>
      </div>

      {/* 底部进度栏 */}
      <div
        className={cn(
          "pointer-events-none fixed bottom-0 left-0 right-0 z-50 transition-all duration-200",
          visible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
        )}
      >
        <div className="mx-auto max-w-3xl px-4 pb-4">
          <div
            className="pointer-events-auto rounded-xl border px-4 py-3 backdrop-blur-md"
            style={{
              background: "color-mix(in srgb, var(--reader-card-bg) 90%, transparent)",
              borderColor: "var(--reader-border)",
            }}
          >
            <div className="flex items-center gap-3">
              {onPrevChapter && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onPrevChapter}
                  disabled={!hasPrevChapter}
                  className={cn(
                    "shrink-0 h-8 w-8 rounded-lg transition-opacity",
                    !hasPrevChapter && "opacity-30 cursor-not-allowed"
                  )}
                  style={{ color: "var(--reader-text)" }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span
                    className="text-xs truncate"
                    style={{ color: "var(--reader-muted-text)" }}
                  >
                    {currentChapterTitle || "正在阅读"}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    {readingDuration !== undefined && readingDuration > 0 && (
                      <span
                        className="text-xs"
                        style={{ color: "var(--reader-muted-text)" }}
                      >
                        已读 {formatDuration(readingDuration)}
                      </span>
                    )}
                    <span
                      className="text-xs font-medium tabular-nums"
                      style={{ color: "var(--reader-primary)" }}
                    >
                      {(progress * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
                
                {/* 进度条 */}
                <div
                  className="h-1 w-full rounded-full overflow-hidden"
                  style={{
                    background: "color-mix(in srgb, var(--reader-text) 10%, transparent)",
                  }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-300"
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
                    "shrink-0 h-8 w-8 rounded-lg transition-opacity",
                    !hasNextChapter && "opacity-30 cursor-not-allowed"
                  )}
                  style={{ color: "var(--reader-text)" }}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
