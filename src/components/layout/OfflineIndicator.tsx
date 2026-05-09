"use client";

import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-[100] -translate-x-1/2 animate-in fade-in zoom-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-2.5 rounded-2xl border border-destructive/20 bg-destructive/90 px-4 py-2.5 text-[13px] font-bold text-white shadow-2xl backdrop-blur-md">
        <WifiOff className="h-4 w-4" />
        <span>当前处于离线模式，仅能阅读已缓存书籍</span>
      </div>
    </div>
  );
}
