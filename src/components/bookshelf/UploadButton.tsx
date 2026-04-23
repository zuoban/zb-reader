"use client";

import { useState, useRef } from "react";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface UploadButtonProps {
  onUploadComplete: () => void;
  className?: string;
  variant?: "default" | "outline" | "ghost";
}

export function UploadButton({ onUploadComplete, className, variant = "outline" }: UploadButtonProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        const formData = new FormData();
        formData.append("file", file);

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
        const message = error instanceof Error ? error.message : "上传失败";
        toast.error(`《${file.name}》${message}`);
      }
    }

    setUploading(false);
    onUploadComplete();
    
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".epub,application/epub+zip"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
      <Button
        variant={variant}
        size="sm"
        onClick={handleClick}
        disabled={uploading}
        className={className}
      >
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
      </Button>
    </>
  );
}
