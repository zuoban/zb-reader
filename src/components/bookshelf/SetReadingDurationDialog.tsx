"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Clock } from "lucide-react";
import { toast } from "sonner";

interface SetReadingDurationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookId: string;
  bookTitle: string;
  currentDuration: number;
  onSuccess: (newDuration: number) => void;
}

export function SetReadingDurationDialog({
  open,
  onOpenChange,
  bookId,
  bookTitle,
  currentDuration,
  onSuccess,
}: SetReadingDurationDialogProps) {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && currentDuration > 0) {
      const h = Math.floor(currentDuration / 3600);
      const m = Math.floor((currentDuration % 3600) / 60);
      setHours(h);
      setMinutes(m);
    } else {
      setHours(0);
      setMinutes(0);
    }
  }, [open, currentDuration]);

  const handleSubmit = async () => {
    const totalSeconds = hours * 3600 + minutes * 60;

    if (totalSeconds < 0) {
      toast.error("请输入有效的阅读时长");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/progress/duration", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookId,
          readingDuration: totalSeconds,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "设置失败");
      }

      toast.success("阅读时长已更新");
      onSuccess(totalSeconds);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "设置失败");
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}小时${m}分钟`;
    if (m > 0) return `${m}分钟`;
    return "未记录";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl border-border/70 bg-card/92">
        <DialogHeader>
          <DialogTitle className="text-xl tracking-tight flex items-center gap-2">
            <Clock className="h-5 w-5" />
            设置阅读时长
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {bookTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                小时
              </label>
              <Input
                type="number"
                min={0}
                max={999}
                value={hours}
                onChange={(e) => setHours(Math.max(0, parseInt(e.target.value) || 0))}
                className="text-center"
              />
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                分钟
              </label>
              <Input
                type="number"
                min={0}
                max={59}
                value={minutes}
                onChange={(e) => setMinutes(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                className="text-center"
              />
            </div>
          </div>

          {currentDuration > 0 && (
            <p className="text-sm text-muted-foreground">
              当前记录：{formatDuration(currentDuration)}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            确认
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}