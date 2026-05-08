"use client";

import { Component, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";
import { logger } from "@/lib/logger";

interface ReaderErrorBoundaryProps {
  children: ReactNode;
  bookId?: string;
}

interface ReaderErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ReaderErrorBoundary extends Component<ReaderErrorBoundaryProps, ReaderErrorBoundaryState> {
  constructor(props: ReaderErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ReaderErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error("reader-error-boundary", "Reader error", error, errorInfo.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return <ReaderErrorFallback error={this.state.error} onReset={this.handleReset} />;
    }

    return this.props.children;
  }
}

function ReaderErrorFallback({
  error,
  onReset,
}: {
  error: Error | null;
  onReset: () => void;
}) {
  const router = useRouter();

  return (
    <div className="liquid-page flex h-screen w-screen items-center justify-center bg-background p-4">
      <Card className="liquid-panel w-full max-w-md space-y-4 p-6 text-center">
        <div className="flex justify-center">
          <div className="liquid-control rounded-full p-3">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">阅读器加载失败</h2>
          <p className="text-sm text-muted-foreground">
            {error?.message || "书籍内容加载时发生错误"}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => router.push("/bookshelf")}
            className="flex-1 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回书架
          </Button>
          <Button onClick={onReset} className="flex-1 cursor-pointer">
            <RefreshCw className="h-4 w-4 mr-2" />
            重新加载
          </Button>
        </div>
      </Card>
    </div>
  );
}
