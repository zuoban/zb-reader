"use client";

import { Component, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";

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
    console.error("[ReaderErrorBoundary]", error, errorInfo.componentStack);
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
    <div className="h-screen w-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-md w-full p-6 text-center space-y-4">
        <div className="flex justify-center">
          <div className="rounded-full bg-destructive/10 p-3">
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
