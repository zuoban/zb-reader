"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, RotateCcw, Monitor, Clock } from "lucide-react";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";
import type { ProgressHistory } from "@/lib/db/schema";

export interface ProgressHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookId: string;
  onRestore: (historyId: string) => Promise<void>;
  onJumpToLocation?: (location: string, scrollRatio: number | null) => void;
}

export function ProgressHistoryDialog({
  open,
  onOpenChange,
  bookId,
  onRestore,
  onJumpToLocation,
}: ProgressHistoryDialogProps) {
  const [history, setHistory] = useState<ProgressHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);

  useEffect(() => {
    if (open && bookId) {
      loadHistory();
    }
  }, [open, bookId]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/progress/history?bookId=${bookId}`);
      if (!response.ok) throw new Error("Failed to load history");
      const data = await response.json();
      setHistory(data.history || []);
    } catch (error) {
      logger.error("reader", "Failed to load history", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (historyId: string) => {
    setRestoring(historyId);
    try {
      await onRestore(historyId);
      onOpenChange(false);
    } catch (error) {
      logger.error("reader", "Failed to restore progress history", error);
    } finally {
      setRestoring(null);
    }
  };

  const handlePreview = (item: ProgressHistory) => {
    if (onJumpToLocation && item.location) {
      onJumpToLocation(item.location, item.scrollRatio);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    }
    return `${minutes}分钟`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            阅读历史
          </DialogTitle>
          <DialogDescription>
            选择一个历史位置恢复，或点击预览跳转
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              加载中...
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mb-2 opacity-50" />
              <p>暂无历史记录</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "group rounded-lg border p-3 transition-all hover:border-primary",
                    restoring === item.id && "opacity-50"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Monitor className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {item.deviceName || "未知设备"}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(item.createdAt)}
                        </span>
                        <span>进度: {(item.progress * 100).toFixed(2)}%</span>
                        {item.readingDuration > 0 && (
                          <span>时长: {formatDuration(item.readingDuration)}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-1">
                      {onJumpToLocation && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handlePreview(item)}
                          disabled={restoring !== null}
                          className="h-7 px-2 text-xs"
                        >
                          预览
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRestore(item.id)}
                        disabled={restoring !== null}
                        className="h-7 px-2 text-xs"
                      >
                        {restoring === item.id ? (
                          <RotateCcw className="h-3 w-3 animate-spin" />
                        ) : (
                          "恢复"
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
