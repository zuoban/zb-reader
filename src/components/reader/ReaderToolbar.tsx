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
        className={`fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border/50 shadow-lg transition-all duration-300 ${
          visible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
        }`}
      >
        <div className="flex items-center justify-between h-14 px-2">
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={onBack}
                  className="cursor-pointer transition-all duration-200 hover:bg-primary/10 hover:scale-105"
                >
                  <ArrowLeft className="size-5" />
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
                  className="cursor-pointer transition-all duration-200 hover:bg-primary/10 hover:scale-105"
                >
                  <List className="size-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>目录</TooltipContent>
            </Tooltip>
          </div>

          <h1 className="flex-1 mx-3 text-sm font-semibold text-center truncate text-foreground">
            {title}
          </h1>

          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={onToggleBookmark}
                  className="cursor-pointer transition-all duration-200 hover:bg-primary/10 hover:scale-105"
                >
                  {isBookmarked ? (
                    <BookmarkCheck className="size-5 text-primary" />
                  ) : (
                    <Bookmark className="size-5" />
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
                  className="cursor-pointer transition-all duration-200 hover:bg-primary/10 hover:scale-105"
                >
                  <StickyNote className="size-5" />
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
                  className="cursor-pointer transition-all duration-200 hover:bg-primary/10 hover:scale-105"
                >
                  {isSpeaking ? (
                    <Pause className="size-5 text-primary" />
                  ) : (
                    <Volume2 className="size-5" />
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
                  className="cursor-pointer transition-all duration-200 hover:bg-primary/10 hover:scale-105"
                >
                  <Settings className="size-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>设置</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Bottom toolbar */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border/50 shadow-lg transition-all duration-300 ${
          visible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
        }`}
      >
        <div className="flex items-center gap-4 px-4 py-4">
          <span className="text-xs font-medium text-foreground whitespace-nowrap min-w-[3rem]">
            {Math.round(progress * 100)}%
          </span>

          <Slider
            className="flex-1"
            value={[progress * 100]}
            min={0}
            max={100}
            step={0.1}
            onValueChange={(value) => onProgressChange(value[0] / 100)}
          />

          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap min-w-[4.5rem] text-right">
            {currentPage !== undefined && totalPages !== undefined
              ? `${currentPage} / ${totalPages}`
              : ""}
          </span>
        </div>
      </div>
    </TooltipProvider>
  );
}
