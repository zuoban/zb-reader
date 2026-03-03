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
  ArrowUp,
  ArrowDown,
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
import { cn } from "@/lib/utils";

interface ReaderToolbarProps {
  visible: boolean;
  title: string;
  currentPage?: number;
  totalPages?: number;
  progress: number;
  isBookmarked: boolean;
  onBack: () => void;
  onToggleToc: () => void;
  onToggleBookmark: () => void;
  onToggleSettings: () => void;
  onToggleNotes: () => void;
  onToggleTts: () => void;
  isSpeaking: boolean;
  onProgressChange: (progress: number) => void;
  onPrevPage?: () => void;
  onNextPage?: () => void;
  onPrevChapter?: () => void;
  onNextChapter?: () => void;
  hasPrevChapter?: boolean;
  hasNextChapter?: boolean;
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
            "cursor-pointer h-9 w-9 rounded-lg transition-all duration-200",
            "hover:bg-[var(--reader-primary-light,_rgba(8,145,178,0.1))]",
            "active:scale-95",
            isActive && "bg-[var(--reader-primary-light,_rgba(8,145,178,0.15))] text-[var(--reader-primary,_#0891B2)]",
            className
          )}
          style={{ color: "var(--reader-text)" }}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
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
  onPrevPage,
  onNextPage,
  onPrevChapter,
  onNextChapter,
  hasPrevChapter,
  hasNextChapter,
}: ReaderToolbarProps) {
  return (
    <TooltipProvider>
      <div
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-out",
          visible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
        )}
      >
        <div
          className={cn(
            "mx-3 mt-2 rounded-2xl",
            "border backdrop-blur-xl"
          )}
          style={{
            background: "var(--reader-card-bg)",
            borderColor: "var(--reader-border)",
            boxShadow: "0 4px 24px var(--reader-shadow)",
          }}
        >
          <div className="flex items-center justify-between h-12 px-1">
            <div className="flex items-center gap-0.5">
              <ToolbarButton onClick={onBack} tooltip="返回书架">
                <ArrowLeft className="size-5" />
              </ToolbarButton>
              <ToolbarButton onClick={onToggleToc} tooltip="目录">
                <List className="size-5" />
              </ToolbarButton>
            </div>

            <h1
              className="flex-1 mx-2 text-sm font-medium text-center truncate"
              style={{ color: "var(--reader-text)" }}
            >
              {title}
            </h1>

            <div className="flex items-center gap-0.5">
              <ToolbarButton
                onClick={onToggleBookmark}
                tooltip={isBookmarked ? "取消书签" : "添加书签"}
                isActive={isBookmarked}
              >
                {isBookmarked ? (
                  <BookmarkCheck className="size-5" />
                ) : (
                  <Bookmark className="size-5" />
                )}
              </ToolbarButton>

              <ToolbarButton onClick={onToggleNotes} tooltip="笔记">
                <StickyNote className="size-5" />
              </ToolbarButton>

              <ToolbarButton
                onClick={onToggleTts}
                tooltip={isSpeaking ? "暂停朗读" : "开始朗读"}
                isActive={isSpeaking}
              >
                {isSpeaking ? (
                  <Pause className="size-5" />
                ) : (
                  <Volume2 className="size-5" />
                )}
              </ToolbarButton>

              <ToolbarButton onClick={onToggleSettings} tooltip="设置">
                <Settings className="size-5" />
              </ToolbarButton>
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
        <div
          className={cn(
            "mx-3 mb-2 rounded-2xl",
            "border backdrop-blur-xl"
          )}
          style={{
            background: "var(--reader-card-bg)",
            borderColor: "var(--reader-border)",
            boxShadow: "0 -4px 24px var(--reader-shadow)",
          }}
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <div
              className="text-xs font-semibold whitespace-nowrap min-w-[3rem] text-center px-2 py-1 rounded-md"
              style={{
                background: "var(--reader-primary-light, rgba(8,145,178,0.1))",
                color: "var(--reader-primary, #0891B2)",
              }}
            >
              {Math.round(progress * 100)}%
            </div>

            {onPrevPage && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onPrevPage}
                className="cursor-pointer h-8 w-8 rounded-lg transition-colors"
                style={{ color: "var(--reader-muted-text)" }}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
            )}

            {onPrevChapter && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onPrevChapter}
                disabled={!hasPrevChapter}
                className={cn(
                  "cursor-pointer h-8 w-8 rounded-lg transition-colors",
                  !hasPrevChapter && "opacity-30 cursor-not-allowed"
                )}
                style={{ color: "var(--reader-muted-text)" }}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}

            <div className="flex-1 relative">
              <div
                className="absolute inset-0 h-2 top-1/2 -translate-y-1/2 rounded-full overflow-hidden"
                style={{ background: "var(--reader-border)" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-150"
                  style={{
                    width: `${progress * 100}%`,
                    background: "var(--reader-primary, #0891B2)",
                    opacity: 0.6,
                  }}
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

            {onNextChapter && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onNextChapter}
                disabled={!hasNextChapter}
                className={cn(
                  "cursor-pointer h-8 w-8 rounded-lg transition-colors",
                  !hasNextChapter && "opacity-30 cursor-not-allowed"
                )}
                style={{ color: "var(--reader-muted-text)" }}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}

            {onNextPage && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onNextPage}
                className="cursor-pointer h-8 w-8 rounded-lg transition-colors"
                style={{ color: "var(--reader-muted-text)" }}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
            )}

            <span
              className="text-xs font-medium whitespace-nowrap min-w-[4rem] text-right"
              style={{ color: "var(--reader-muted-text)" }}
            >
              {currentPage !== undefined && totalPages !== undefined
                ? `${currentPage} / ${totalPages}`
                : ""}
            </span>
          </div>

          <div
            className="flex items-center justify-center gap-6 pb-2 text-xs"
            style={{ color: "var(--reader-muted-text)" }}
          >
            <div className="flex items-center gap-1.5">
              <kbd
                className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-medium rounded border"
                style={{
                  background: "var(--reader-card-bg)",
                  borderColor: "var(--reader-border)",
                }}
              >
                <ChevronLeft className="h-3 w-3" />
              </kbd>
              <span>上一章</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd
                className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-medium rounded border"
                style={{
                  background: "var(--reader-card-bg)",
                  borderColor: "var(--reader-border)",
                }}
              >
                <ArrowUp className="h-3 w-3" />
              </kbd>
              <span>向上滚动</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd
                className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-medium rounded border"
                style={{
                  background: "var(--reader-card-bg)",
                  borderColor: "var(--reader-border)",
                }}
              >
                <ArrowDown className="h-3 w-3" />
              </kbd>
              <span>向下滚动</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd
                className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-medium rounded border"
                style={{
                  background: "var(--reader-card-bg)",
                  borderColor: "var(--reader-border)",
                }}
              >
                <ChevronRight className="h-3 w-3" />
              </kbd>
              <span>下一章</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd
                className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-medium rounded border"
                style={{
                  background: "var(--reader-card-bg)",
                  borderColor: "var(--reader-border)",
                }}
              >
                Esc
              </kbd>
              <span>返回</span>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
