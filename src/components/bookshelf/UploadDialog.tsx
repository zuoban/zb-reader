"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { CheckCircle, FileText, Loader2, Upload, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete: () => void;
}

interface UploadFile {
  file: File;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  error?: string;
}

export function UploadDialog({
  open,
  onOpenChange,
  onUploadComplete,
}: UploadDialogProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      file,
      status: "pending" as const,
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/epub+zip": [".epub"],
    },
    multiple: true,
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    setUploading(true);

    for (let i = 0; i < files.length; i++) {
      if (files[i].status === "success") continue;

      setFiles((prev) =>
        prev.map((f, idx) =>
          idx === i ? { ...f, status: "uploading", progress: 0 } : f
        )
      );

      try {
        const formData = new FormData();
        formData.append("file", files[i].file);

        const res = await fetch("/api/books", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "上传失败");
        }

        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: "success", progress: 100 } : f
          )
        );
      } catch (error) {
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i
              ? {
                  ...f,
                  status: "error",
                  error:
                    error instanceof Error ? error.message : "上传失败",
                }
              : f
          )
        );
      }
    }

    setUploading(false);
    onUploadComplete();
  };

  const handleClose = () => {
    if (!uploading) {
      setFiles([]);
      onOpenChange(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const pendingCount = files.filter((f) => f.status !== "success").length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="overflow-hidden rounded-[1.35rem] border-border/60 bg-card/92 p-0 shadow-[0_36px_100px_-48px_color-mix(in_oklab,var(--foreground)_40%,transparent)] sm:max-w-xl sm:rounded-[1.75rem]">
        <div className="relative">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent" />
          <div className="absolute -right-14 top-0 h-32 w-32 rounded-full bg-primary/12 blur-3xl dark:bg-primary/15" />
          <div className="absolute -left-10 bottom-0 h-28 w-28 rounded-full bg-sky-500/10 blur-3xl dark:bg-sky-400/10" />

          <div className="relative space-y-4 p-4 sm:space-y-5 sm:p-7">
            <DialogHeader>
              <div className="mb-2 inline-flex w-fit items-center rounded-full border border-primary/15 bg-primary/8 px-3 py-1 text-[11px] font-medium text-primary sm:mb-3 sm:text-xs">
                添加新书
              </div>
              <DialogTitle className="text-lg tracking-tight sm:text-2xl">上传电子书</DialogTitle>
            </DialogHeader>

            <div
              {...getRootProps()}
              className={`cursor-pointer rounded-[1.2rem] border-2 border-dashed p-5 text-center transition-all duration-200 sm:rounded-[1.5rem] sm:p-8 ${
                isDragActive
                  ? "border-primary bg-primary/8 shadow-[0_20px_50px_-36px_rgba(99,102,241,0.55)]"
                  : "border-muted-foreground/20 bg-background/50 hover:border-primary/35 hover:bg-background/65"
              }`}
            >
              <input {...getInputProps()} />
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15 sm:mb-4 sm:h-16 sm:w-16">
                <Upload className="h-7 w-7" />
              </div>
              <p className="text-sm font-medium text-foreground">
                {isDragActive ? (
                  "松开鼠标上传文件..."
                ) : (
                  <>
                    拖拽文件到此处，或
                    <span className="text-primary"> 点击选择文件</span>
                  </>
                )}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                支持 EPUB 格式，建议单个文件体积适中
              </p>
            </div>

            {files.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">待上传文件</p>
                  <span className="rounded-full border border-border/50 bg-background/60 px-2.5 py-1 text-xs text-muted-foreground">
                    {files.length} 个文件
                  </span>
                </div>
                <div className="max-h-56 space-y-2.5 overflow-y-auto pr-1 sm:max-h-60 sm:space-y-3">
                  {files.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-[1.1rem] border border-border/55 bg-background/55 p-3 backdrop-blur-sm sm:rounded-2xl sm:p-3.5"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15 sm:h-11 sm:w-11 sm:rounded-2xl">
                        <FileText className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {f.file.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground sm:text-xs">
                          {formatSize(f.file.size)}
                        </p>
                        {f.status === "uploading" && (
                          <Progress value={50} className="mt-2 h-1.5" />
                        )}
                        {f.status === "error" && (
                          <p className="mt-1 text-xs text-destructive">{f.error}</p>
                        )}
                      </div>
                      <div className="shrink-0">
                        {f.status === "success" ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : f.status === "uploading" ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-xl"
                            onClick={() => removeFile(i)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {files.length > 0 && (
              <div className="flex justify-end gap-2 border-t border-border/40 pt-1">
                <Button variant="outline" onClick={handleClose} disabled={uploading} className="rounded-xl">
                  取消
                </Button>
                <Button
                  onClick={uploadFiles}
                  disabled={uploading || files.every((f) => f.status === "success")}
                  className="rounded-xl"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      上传中...
                    </>
                  ) : (
                    `上传 ${pendingCount} 个文件`
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
