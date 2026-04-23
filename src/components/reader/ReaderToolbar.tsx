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
  currentChapterTitle?: string;
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
          className={cn(
            "liquid-control h-9 w-9 cursor-pointer rounded-xl transition-all duration-200",
            "hover:-translate-y-0.5",
            isActive
              ? "border-[var(--reader-primary)]/35 bg-[var(--reader-primary)]/15 text-[var(--reader-primary)] shadow-inner"
              : "hover:text-[var(--reader-primary)]",
            className
          )}
          style={{ color: isActive ? "var(--reader-primary)" : "var(--reader-text)" }}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent 
        side="bottom" 
        sideOffset={8}
        hideArrow
        className="border border-border/50 bg-background/80 text-xs text-foreground shadow-lg backdrop-blur-xl"
      >
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
});

export const ReaderToolbar = memo(function ReaderToolbar({
  visible,
  title,
  currentChapterTitle,
  progress: _progress,
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
          "pointer-events-none fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-out",
          visible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
        )}
      >
        <div className="mx-auto max-w-3xl px-4 pt-4">
          <div
            className="surface-elevated pointer-events-auto relative flex items-center justify-between overflow-hidden rounded-2xl border px-2 py-2 backdrop-blur-2xl transition-shadow duration-300"
            style={{
              background: "linear-gradient(145deg, color-mix(in srgb, var(--reader-card-bg) 84%, transparent), color-mix(in srgb, var(--reader-card-bg) 62%, transparent))",
              borderColor: "var(--reader-border)",
            }}
          >
            <div className="liquid-hairline pointer-events-none absolute inset-x-4 top-0 h-px" />
            {/* 左侧：返回和目录 */}
            <div className="flex items-center gap-1">
              <ToolbarButton onClick={onBack} tooltip="返回书架">
                <ArrowLeft className="size-[18px]" />
              </ToolbarButton>
              <div className="h-5 w-px mx-1" style={{ background: "var(--reader-border)" }} />
              <ToolbarButton onClick={onToggleToc} tooltip="目录">
                <List className="size-[18px]" />
              </ToolbarButton>
            </div>

            {/* 中间：书名和章节 */}
            <div className="min-w-0 flex-1 px-3 text-center">
              <h1
                className="truncate text-sm font-semibold tracking-tight"
                style={{ color: "var(--reader-text)" }}
              >
                {title}
              </h1>
              {showChapterMeta && (
                <p
                  className="truncate text-xs mt-0.5 font-medium"
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

              <div className="h-5 w-px mx-1" style={{ background: "var(--reader-border)" }} />

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

      {/* 底部进度栏 - 仅保留翻页按钮 */}
      <div
        className={cn(
          "pointer-events-none fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ease-out",
          visible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
        )}
      >
        <div className="mx-auto max-w-3xl px-4 pb-5">
          <div className="flex items-center justify-center gap-4">
            {onPrevChapter && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onPrevChapter}
                disabled={!hasPrevChapter}
                className={cn(
                  "liquid-control pointer-events-auto h-11 w-11 rounded-xl transition-all duration-200 hover:-translate-y-0.5",
                  !hasPrevChapter && "opacity-30 cursor-not-allowed hover:translate-y-0"
                )}
                style={{ 
                  color: "var(--reader-text)",
                  background: "color-mix(in srgb, var(--reader-card-bg) 88%, transparent)",
                  borderColor: "var(--reader-border)",
                }}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            )}

            {onNextChapter && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onNextChapter}
                disabled={!hasNextChapter}
                className={cn(
                  "liquid-control pointer-events-auto h-11 w-11 rounded-xl transition-all duration-200 hover:-translate-y-0.5",
                  !hasNextChapter && "opacity-30 cursor-not-allowed hover:translate-y-0"
                )}
                style={{ 
                  color: "var(--reader-text)",
                  background: "color-mix(in srgb, var(--reader-card-bg) 88%, transparent)",
                  borderColor: "var(--reader-border)",
                }}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
});
