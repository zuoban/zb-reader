"use client";

import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { BackgroundDecoration } from "@/components/bookshelf/BackgroundDecoration";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { logger } from "@/lib/logger";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // 记录错误到日志
  logger.error("global-error", "Unhandled error", error, error.digest);

  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <div className="app-noise relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
          <BackgroundDecoration />
          <Card className="book-card-glass relative z-10 max-w-md w-full p-6 text-center space-y-4">
            <div className="flex justify-center">
              <div className="liquid-control rounded-2xl p-3">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">
                应用出错
              </h2>
              <p className="text-sm text-muted-foreground">
                {error.message || "发生了未知错误，请尝试刷新页面"}
              </p>
              {error.digest && (
                <p className="text-xs text-muted-foreground font-mono">
                  错误编号: {error.digest}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => reset()}
                className="top-action-primary flex-1 cursor-pointer rounded-xl"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                重试
              </Button>
              <Button
                onClick={() => (window.location.href = "/")}
                variant="outline"
                className="liquid-control flex-1 cursor-pointer rounded-xl"
              >
                <Home className="h-4 w-4 mr-2" />
                返回首页
              </Button>
            </div>
          </Card>
        </div>
      </body>
    </html>
  );
}
