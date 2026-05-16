"use client";

import { useId, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { MAX_EPUB_FILE_SIZE_BYTES } from "@/lib/upload-limits";
import { uploadWithProgress } from "@/lib/upload-with-progress";
import { cn } from "@/lib/utils";
import type { ChangeEvent } from "react";

interface UploadButtonProps {
  onUploadComplete: () => void;
  className?: string;
  variant?: "default" | "outline" | "ghost";
}

export function UploadButton({ onUploadComplete, className, variant = "outline" }: UploadButtonProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const inputId = useId();

  const createUploadFile = async (file: File) => {
    const buffer = await file.arrayBuffer();
    return new File([buffer], file.name, {
      type: file.type || "application/epub+zip",
      lastModified: file.lastModified,
    });
  };

  const getUploadErrorMessage = (error: unknown) => {
    if (!(error instanceof Error)) return "上传失败";
    if (error.message.includes("NS_ERROR_FILE")) {
      return "无法读取本地文件，请确认文件未被移动或删除后重新选择";
    }
    if (error.message.includes("NetworkError")) {
      return "网络请求失败，请确认开发服务器已重启后重试";
    }
    return error.message;
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const selectedFiles = Array.from(e.target.files ?? []);
    if (selectedFiles.length === 0) return;

    const files = selectedFiles.filter((file) => {
      if (file.size <= MAX_EPUB_FILE_SIZE_BYTES) return true;
      toast.error(`《${file.name}》文件不能超过 300 MB`);
      return false;
    });

    if (files.length === 0) {
      input.value = "";
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    for (const file of files) {
      try {
        const uploadFile = await createUploadFile(file);
        setUploadProgress(0);

        const result = await uploadWithProgress({
          file: uploadFile,
          onProgress: (percent) => {
            setUploadProgress(percent);
          },
        });

        if (!result.ok) {
          throw new Error(result.error || "上传失败");
        }

        toast.success(`《${file.name}》上传成功`);
      } catch (error) {
        const message = getUploadErrorMessage(error);
        toast.error(`《${file.name}》${message}`);
      }
    }

    setUploading(false);
    setUploadProgress(0);
    onUploadComplete();
    input.value = "";
  };

  return (
    <>
      <input
        id={inputId}
        type="file"
        accept=".epub,application/epub+zip"
        multiple
        className="sr-only"
        disabled={uploading}
        onChange={handleFileChange}
        suppressHydrationWarning
      />
      <div className="flex flex-col gap-1">
        <Button
          asChild
          variant={variant}
          size="sm"
          className={cn(className, uploading && "pointer-events-none opacity-50")}
        >
          <label htmlFor={inputId} aria-disabled={uploading}>
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="ml-1">
                  {uploadProgress > 0 ? `${uploadProgress}%` : "上传中..."}
                </span>
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                <span className="ml-1 hidden sm:inline">上传书籍</span>
              </>
            )}
          </label>
        </Button>
        {uploading && (
          <div className="w-24 sm:w-32">
            <Progress value={uploadProgress} className="h-1" />
          </div>
        )}
      </div>
    </>
  );
}
