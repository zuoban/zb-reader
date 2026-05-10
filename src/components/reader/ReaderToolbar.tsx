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
            "h-7 w-7 cursor-pointer rounded-md transition-all duration-200 ease-out sm:h-8 sm:w-8",
            "focus-visible:ring-1 focus-visible:ring-[var(--reader-primary)] focus-visible:ring-offset-0",
            isActive
              ? "bg-[var(--reader-primary)]/10 text-[var(--reader-primary)]"
              : "text-[var(--reader-text)]/70 hover:bg-[var(--reader-text)]/5 hover:text-[var(--reader-text)]",
            className
          )}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        sideOffset={8}
        hideArrow
        className="reader-toolbar-tooltip text-xs border shadow-lg"
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
  onBack,
  onToggleToc,
  onToggleBookmark,
  onToggleSettings,
  onToggleTts,
  onToggleFullscreen,
  isSpeaking,
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
      {/* 顶部工具栏 */}
      <div
        className={cn(
          "pointer-events-none fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-out",
          visible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
        )}
      >
        <div className="mx-auto max-w-3xl px-4 pt-3">
          <div
            className="reader-toolbar-surface pointer-events-auto flex items-center justify-between rounded-xl px-2 py-1.5 shadow-sm transition-shadow duration-300 sm:px-3"
            style={{
              color: "var(--reader-text)",
            }}
          >
            {/* 左侧：返回和目录 */}
            <div className="flex items-center gap-0.5">
              <ToolbarButton onClick={onBack} tooltip="返回书架">
                <ArrowLeft className="size-4" />
              </ToolbarButton>
              <ToolbarButton onClick={onToggleToc} tooltip="目录">
                <List className="size-4" />
              </ToolbarButton>
            </div>

            {/* 中间：书名 */}
            <div className="min-w-0 flex-1 px-4 text-center">
              <h1
                className="truncate text-sm font-medium tracking-tight text-[var(--reader-text)]/90"
              >
                {title}
              </h1>
            </div>

            {/* 右侧：操作按钮 */}
            <div className="flex items-center gap-0.5">
              <ToolbarButton
                onClick={onToggleBookmark}
                tooltip={isBookmarked ? "取消书签" : "添加书签"}
                isActive={isBookmarked}
              >
                {isBookmarked ? (
                  <BookmarkCheck className="size-4" />
                ) : (
                  <Bookmark className="size-4" />
                )}
              </ToolbarButton>

              <ToolbarButton
                onClick={onToggleTts}
                tooltip={isSpeaking ? "暂停朗读" : "开始朗读"}
                isActive={isSpeaking}
              >
                {isSpeaking ? (
                  <Pause className="size-4" />
                ) : (
                  <Volume2 className="size-4" />
                )}
              </ToolbarButton>

              <ToolbarButton
                onClick={onToggleFullscreen}
                tooltip={isFullscreen ? "退出全屏" : "全屏阅读"}
                isActive={isFullscreen}
              >
                {isFullscreen ? (
                  <Minimize className="size-4" />
                ) : (
                  <Maximize className="size-4" />
                )}
              </ToolbarButton>

              <ToolbarButton onClick={onToggleSettings} tooltip="设置">
                <Settings className="size-4" />
              </ToolbarButton>

              {rightContent}
            </div>
          </div>
        </div>
      </div>

      {/* 底部翻页控制 */}
      <div
        className={cn(
          "pointer-events-none fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ease-out",
          visible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
        )}
      >
        <div className="mx-auto max-w-3xl px-4 pb-[calc(env(safe-area-inset-bottom)+0.25rem)]">
          <div className="reader-page-turn-dock pointer-events-auto mx-auto flex w-fit items-center justify-center gap-0.5 rounded-full px-1 py-0.5">
            {onPrevChapter && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onPrevChapter}
                disabled={!hasPrevChapter}
                className={cn(
                  "reader-page-turn-button h-9 w-9 rounded-full",
                  !hasPrevChapter && "cursor-not-allowed opacity-30 hover:translate-y-0"
                )}
                style={{ color: "var(--reader-text)" }}
                aria-label="上一章"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
            )}

            {onPrevPage && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onPrevPage}
                className="reader-page-turn-button h-9 w-9 rounded-full"
                style={{ color: "var(--reader-text)" }}
                aria-label="上一页"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}

            {(onPrevPage || onPrevChapter) && (onNextPage || onNextChapter) ? (
              <div className="h-4 w-px bg-[color-mix(in_srgb,var(--reader-border)_64%,transparent)]" />
            ) : null}

            {onNextPage && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onNextPage}
                className="reader-page-turn-button h-9 w-9 rounded-full"
                style={{ color: "var(--reader-text)" }}
                aria-label="下一页"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}

            {onNextChapter && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onNextChapter}
                disabled={!hasNextChapter}
                className={cn(
                  "reader-page-turn-button h-9 w-9 rounded-full",
                  !hasNextChapter && "cursor-not-allowed opacity-30 hover:translate-y-0"
                )}
                style={{ color: "var(--reader-text)" }}
                aria-label="下一章"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
});
