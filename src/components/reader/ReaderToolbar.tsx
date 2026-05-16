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
  const { isSpeaking, isTtsViewOpen: _isTtsViewOpen, handleToggleTts } = useTts();
  const { 
    toolbarVisible: _toolbarVisible, 
    isFullscreen, 
    toggleFullscreen, 
    openToc, 
    setSettingsOpen 
  } = useReaderUI();
  const {
    handleBack,
  } = useNavigation();
  const { isCurrentBookmarked, handleToggleBookmark } = useAnnotation();

  return (
    <TooltipProvider>
      {/* 顶部导航栏 - 不再使用 fixed 定位，改为自然流布局 */}
      <div className="relative w-full overflow-hidden transition-all duration-300">
        <div className="grid h-11 grid-cols-[auto_minmax(0,1fr)_auto] items-center bg-[var(--reader-bg)]/80 px-4 backdrop-blur-xl">
          {/* 左侧：返回 */}
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 opacity-70 hover:opacity-100 transition-opacity">
            <ToolbarButton onClick={handleBack} tooltip="返回书架">
              <ArrowLeft className="size-4.5" />
            </ToolbarButton>
            <div className="h-4 w-px bg-[var(--reader-text)]/10 mx-1 sm:mx-1.5" />
            <ToolbarButton onClick={openToc} tooltip="目录">
              <List className="size-4.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={handleToggleBookmark}
              tooltip={isCurrentBookmarked ? "取消书签" : "添加书签"}
              isActive={isCurrentBookmarked}
            >
              {isCurrentBookmarked ? <BookmarkCheck className="size-4.5" /> : <Bookmark className="size-4.5" />}
            </ToolbarButton>
          </div>

          {/* 中间：书名 */}
          <div className="min-w-0 px-2 text-center sm:px-4 opacity-50">
            <h1
              className="truncate font-heading text-[12px] font-bold tracking-tight text-[var(--reader-text)]"
              title={book?.title}
            >
              {book?.title}
            </h1>
          </div>

          {/* 右侧：功能 */}
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 opacity-70 hover:opacity-100 transition-opacity">
            <ToolbarButton
              onClick={handleToggleTts}
              tooltip={isSpeaking ? "停止" : "朗读"}
              isActive={isSpeaking}
            >
              {isSpeaking ? <Pause className="size-4.5" /> : <Volume2 className="size-4.5" />}
            </ToolbarButton>

            <ToolbarButton
              onClick={toggleFullscreen}
              tooltip={isFullscreen ? "退出全屏" : "全屏"}
              isActive={isFullscreen}
            >
              {isFullscreen ? <Minimize className="size-4.5" /> : <Maximize className="size-4.5" />}
            </ToolbarButton>

            <div className="h-4 w-px bg-[var(--reader-text)]/10 mx-1 sm:mx-1.5" />

            <ToolbarButton onClick={() => setSettingsOpen(true)} tooltip="阅读设置">
              <Settings className="size-4.5" />
            </ToolbarButton>

            {rightContent}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
});
