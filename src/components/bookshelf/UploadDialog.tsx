"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { CheckCircle, FileText, Loader2, Upload, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

  const formatFileName = (name: string, maxLength: number = 50) => {
    if (name.length <= maxLength) return name;
    const lastDot = name.lastIndexOf('.');
    const ext = lastDot > 0 ? name.slice(lastDot) : '';
    const base = lastDot > 0 ? name.slice(0, lastDot) : name;
    const baseLength = maxLength - ext.length - 3;
    if (baseLength <= 0) return name.slice(0, maxLength - 3) + '...';
    return base.slice(0, baseLength) + '...' + ext;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const pendingCount = files.filter((f) => f.status !== "success").length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="liquid-panel overflow-hidden rounded-2xl p-0 sm:max-w-2xl">
        <div className="relative">
          <div className="liquid-hairline absolute inset-x-6 top-0 h-px" />

          <div className="relative space-y-5 p-5 sm:space-y-6 sm:p-8">
            <DialogHeader>
              <div className="liquid-control mb-2.5 inline-flex w-fit items-center rounded-xl px-3.5 py-1 text-[11px] font-bold text-muted-foreground/80 sm:mb-4 sm:text-xs">
                ADD NEW COLLECTION
              </div>
              <DialogTitle className="text-xl font-extrabold tracking-tight sm:text-3xl">上传电子书</DialogTitle>
              <DialogDescription className="text-sm font-medium text-muted-foreground/90 sm:text-base">
                选择一个或多个 EPUB 文件添加到你的书架。
              </DialogDescription>
            </DialogHeader>

            <div
              {...getRootProps()}
              className={`liquid-control cursor-pointer rounded-[2rem] border-2 border-dashed p-6 text-center transition-all duration-400 sm:p-10 ${
                isDragActive
                  ? "border-ring bg-ring/5 shadow-[0_24px_64px_-32px_color-mix(in_oklab,var(--cta)_45%,transparent)]"
                  : "border-[color:var(--glass-border)] hover:border-ring/35 hover:bg-foreground/5"
              }`}
            >
              <input {...getInputProps()} />
              <div className="liquid-control mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[1.25rem] text-[color:var(--cta)] shadow-lg sm:mb-6 sm:h-18 sm:w-18 sm:rounded-[1.5rem]">
                <Upload className="h-8 w-8 sm:h-10 sm:w-10" />
              </div>
              <p className="text-base font-bold tracking-tight text-foreground">
                {isDragActive ? (
                  "松开鼠标立即上传"
                ) : (
                  <>
                    拖拽文件到此处，或
                    <span className="text-[color:var(--cta)]"> 点击浏览文件</span>
                  </>
                )}
              </p>
              <p className="mt-2 text-xs font-semibold text-muted-foreground/75 sm:text-sm">
                仅支持 EPUB 格式 · 建议单个文件小于 50MB
              </p>
            </div>

            {files.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <p className="text-sm font-bold tracking-tight text-foreground">待上传队列</p>
                  <span className="liquid-control rounded-full px-3 py-1 text-[10px] font-extrabold text-muted-foreground/90 uppercase tracking-wider">
                    {files.length} ITEMS
                  </span>
                </div>
                <div className="max-h-[32vh] space-y-3 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {files.map((f, i) => (
                    <div
                      key={i}
                      className="liquid-stat group flex items-center gap-4 rounded-2xl p-3.5 transition-all duration-300 hover:bg-foreground/5"
                    >
                      <div className="liquid-control flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[color:var(--cta)] sm:h-12 sm:w-12">
                        <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-foreground">
                          {formatFileName(f.file.name)}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-[10px] font-bold text-muted-foreground/70 uppercase">
                            {formatSize(f.file.size)}
                          </span>
                          {f.status === "uploading" && (
                            <span className="flex h-1 w-1 rounded-full bg-[color:var(--cta)] animate-pulse" />
                          )}
                        </div>
                        {f.status === "uploading" && (
                          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-foreground/5">
                            <div className="h-full bg-[color:var(--cta)] transition-all duration-500" style={{ width: `${f.progress}%` }} />
                          </div>
                        )}
                        {f.status === "error" && (
                          <p className="mt-1.5 text-[11px] font-medium text-destructive">{f.error}</p>
                        )}
                      </div>
                      <div className="shrink-0">
                        {f.status === "success" ? (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/10 text-green-500">
                            <CheckCircle className="h-5 w-5" />
                          </div>
                        ) : f.status === "uploading" ? (
                          <Loader2 className="h-5 w-5 animate-spin text-[color:var(--cta)]" />
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-xl opacity-60 transition-opacity hover:opacity-100"
                            onClick={() => removeFile(i)}
                          >
                            <X className="h-4.5 w-4.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {files.length > 0 && (
              <div className="flex justify-end gap-3 border-t border-border/20 pt-2">
                <Button 
                  variant="outline" 
                  onClick={handleClose} 
                  disabled={uploading} 
                  className="h-11 rounded-xl px-6 font-bold transition-all duration-300 hover:bg-foreground/5"
                >
                  取消
                </Button>
                <Button
                  onClick={uploadFiles}
                  disabled={uploading || files.every((f) => f.status === "success")}
                  className="h-11 rounded-xl px-8 font-bold shadow-lg transition-all duration-300"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2.5 h-4 w-4 animate-spin" />
                      正在处理...
                    </>
                  ) : (
                    `上传 ${pendingCount} 个文件`
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
