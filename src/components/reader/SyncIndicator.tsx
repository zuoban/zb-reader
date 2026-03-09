"use client";

import { useEffect, useState } from "react";
import { Loader2, Check, AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export type SyncStatus = "idle" | "pending" | "syncing" | "synced" | "error";

export interface SyncIndicatorProps {
  status: SyncStatus;
  pendingCount?: number;
  errorMessage?: string;
  onRetry?: () => void;
  className?: string;
}

export function SyncIndicator({
  status,
  pendingCount = 0,
  errorMessage,
  onRetry,
  className,
}: SyncIndicatorProps) {
  const [showSynced, setShowSynced] = useState(false);

  useEffect(() => {
    if (status === "synced") {
      setShowSynced(true);
      const timer = setTimeout(() => {
        setShowSynced(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  if (status === "idle") {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-xs transition-all",
        status === "pending" && "text-muted-foreground",
        status === "syncing" && "text-primary",
        status === "synced" && "text-green-600",
        status === "error" && "text-destructive",
        className
      )}
      title={getStatusMessage(status, pendingCount, errorMessage)}
    >
      {renderIcon(status, showSynced)}
      <span className="hidden sm:inline">
        {getStatusMessage(status, pendingCount, errorMessage)}
      </span>
      {status === "error" && onRetry && (
        <button
          onClick={onRetry}
          className="ml-1 text-xs underline hover:no-underline"
        >
          重试
        </button>
      )}
    </div>
  );
}

function renderIcon(status: SyncStatus, showSynced: boolean) {
  switch (status) {
    case "pending":
      return <Clock className="h-3.5 w-3.5" />;
    case "syncing":
      return <Loader2 className="h-3.5 w-3.5 animate-spin" />;
    case "synced":
      return showSynced ? (
        <Check className="h-3.5 w-3.5" />
      ) : null;
    case "error":
      return <AlertCircle className="h-3.5 w-3.5" />;
    default:
      return null;
  }
}

function getStatusMessage(
  status: SyncStatus,
  pendingCount: number,
  errorMessage?: string
): string {
  switch (status) {
    case "pending":
      return `本地已保存${pendingCount > 1 ? ` (${pendingCount})` : ""}`;
    case "syncing":
      return "同步中...";
    case "synced":
      return "已同步";
    case "error":
      return errorMessage || "同步失败";
    default:
      return "";
  }
}
