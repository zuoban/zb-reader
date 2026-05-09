"use client";

import { useId, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MAX_EPUB_FILE_SIZE_BYTES } from "@/lib/upload-limits";
import { cn } from "@/lib/utils";
import type { ChangeEvent } from "react";

interface UploadButtonProps {
  onUploadComplete: () => void;
  className?: string;
  variant?: "default" | "outline" | "ghost";
}

export function UploadButton({ onUploadComplete, className, variant = "outline" }: UploadButtonProps) {
  const [uploading, setUploading] = useState(false);
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

    for (const file of files) {
      try {
        const uploadFile = await createUploadFile(file);
        const formData = new FormData();
        formData.append("file", uploadFile);

        const res = await fetch("/api/books", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "上传失败");
        }

        toast.success(`《${file.name}》上传成功`);
      } catch (error) {
        const message = getUploadErrorMessage(error);
        toast.error(`《${file.name}》${message}`);
      }
    }

    setUploading(false);
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
      />
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
              <span className="hidden sm:inline">上传中...</span>
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">上传书籍</span>
            </>
          )}
        </label>
      </Button>
    </>
  );
}
