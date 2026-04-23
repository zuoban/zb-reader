import { describe, expect, it, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const mockAuth = vi.fn();
const mockInsertValues = vi.fn();
const mockSaveBookFile = vi.fn();
const mockDeleteBookFile = vi.fn();
const mockDeleteCoverImage = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn(() => ({
      values: mockInsertValues,
    })),
    query: {
      books: {
        findFirst: vi.fn(),
      },
    },
  },
}));

vi.mock("@/lib/storage", () => ({
  saveBookFile: (...args: unknown[]) => mockSaveBookFile(...args),
  saveCoverImage: vi.fn(),
  deleteBookFile: (...args: unknown[]) => mockDeleteBookFile(...args),
  deleteCoverImage: (...args: unknown[]) => mockDeleteCoverImage(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

interface MockUploadFile {
  name: string;
  size: number;
  arrayBuffer: ReturnType<typeof vi.fn>;
}

function createUploadRequest(file: MockUploadFile): NextRequest {
  return {
    formData: vi.fn().mockResolvedValue({
      get: (key: string) => (key === "file" ? file : null),
    }),
  } as unknown as NextRequest;
}

describe("Books API upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: { id: "user-1", username: "test", email: "test@test.com" },
      expires: new Date().toISOString(),
    });
    mockSaveBookFile.mockReturnValue("book-1.epub");
  });

  it("rejects EPUB files larger than the upload limit", async () => {
    const file = {
      name: "large.epub",
      size: 101 * 1024 * 1024,
      arrayBuffer: vi.fn(),
    };

    const { POST } = await import("./route");
    const res = await POST(createUploadRequest(file));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("文件不能超过 100 MB");
    expect(file.arrayBuffer).not.toHaveBeenCalled();
    expect(mockSaveBookFile).not.toHaveBeenCalled();
  });

  it("cleans up the saved EPUB file when database insert fails", async () => {
    const file = {
      name: "book.epub",
      size: 1024,
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
    };
    mockInsertValues.mockRejectedValueOnce(new Error("insert failed"));

    const { POST } = await import("./route");
    const res = await POST(createUploadRequest(file));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("上传失败");
    expect(mockSaveBookFile).toHaveBeenCalled();
    expect(mockDeleteBookFile).toHaveBeenCalledWith("book-1.epub");
  });
});

describe("resolveEpubRelativePath", () => {
  it("resolves relative paths from the OPF directory", async () => {
    const { resolveEpubRelativePath } = await import("./route");

    expect(resolveEpubRelativePath("OPS/package.opf", "images/cover.jpg")).toBe(
      "OPS/images/cover.jpg"
    );
  });

  it("allows parent traversal that stays within the EPUB root", async () => {
    const { resolveEpubRelativePath } = await import("./route");

    expect(resolveEpubRelativePath("OPS/content/package.opf", "../images/cover.jpg")).toBe(
      "OPS/images/cover.jpg"
    );
  });

  it("rejects paths that escape the EPUB root", async () => {
    const { resolveEpubRelativePath } = await import("./route");

    expect(resolveEpubRelativePath("OPS/package.opf", "../../cover.jpg")).toBeNull();
  });

  it("rejects absolute and URL-like paths", async () => {
    const { resolveEpubRelativePath } = await import("./route");

    expect(resolveEpubRelativePath("OPS/package.opf", "/cover.jpg")).toBeNull();
    expect(resolveEpubRelativePath("OPS/package.opf", "https://example.com/cover.jpg")).toBeNull();
  });
});
