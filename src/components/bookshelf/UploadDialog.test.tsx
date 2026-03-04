import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { UploadDialog } from "@/components/bookshelf/UploadDialog";

describe("UploadDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render dialog when open", () => {
    render(
      <UploadDialog open={true} onOpenChange={() => {}} onUploadComplete={() => {}} />
    );

    expect(screen.getByText("上传电子书")).toBeInTheDocument();
    expect(screen.getByText("拖拽文件到此处，或")).toBeInTheDocument();
    expect(screen.getByText("支持 EPUB 格式")).toBeInTheDocument();
  });

  it("should not render when closed", () => {
    render(
      <UploadDialog open={false} onOpenChange={() => {}} onUploadComplete={() => {}} />
    );

    expect(screen.queryByText("上传电子书")).not.toBeInTheDocument();
  });

  it("should display upload icon and instructions", () => {
    render(
      <UploadDialog open={true} onOpenChange={() => {}} onUploadComplete={() => {}} />
    );

    expect(screen.getByText("点击选择文件")).toBeInTheDocument();
  });

  it("should format file sizes correctly", () => {
    render(
      <UploadDialog open={true} onOpenChange={() => {}} onUploadComplete={() => {}} />
    );

    const formatSize = (bytes: number) => {
      if (bytes < 1024) return bytes + " B";
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
      return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    };

    expect(formatSize(512)).toBe("512 B");
    expect(formatSize(1024)).toBe("1.0 KB");
    expect(formatSize(1024 * 1024)).toBe("1.0 MB");
    expect(formatSize(1024 * 1024 * 5.5)).toBe("5.5 MB");
  });
});
