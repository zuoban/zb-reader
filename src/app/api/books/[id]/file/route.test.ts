import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { Readable as NodeReadable } from "stream";

const mockAuth = vi.fn();
const mockFindFirst = vi.fn();
const mockBookFileExists = vi.fn();
const mockGetBookFilePath = vi.fn();
const mockStatSync = vi.fn();
const mockCreateReadStream = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      books: {
        findFirst: () => mockFindFirst(),
      },
    },
  },
}));

vi.mock("@/lib/storage", () => ({
  bookFileExists: (...args: unknown[]) => mockBookFileExists(...args),
  getBookFilePath: (...args: unknown[]) => mockGetBookFilePath(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

vi.mock("fs", () => ({
  default: {
    statSync: (...args: unknown[]) => mockStatSync(...args),
    createReadStream: (...args: unknown[]) => mockCreateReadStream(...args),
  },
  statSync: (...args: unknown[]) => mockStatSync(...args),
  createReadStream: (...args: unknown[]) => mockCreateReadStream(...args),
}));

function createRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"));
}

describe("buildBookDownloadName", () => {
  it("sanitizes the downloaded filename", async () => {
    const { buildBookDownloadName } = await import("./route");

    expect(buildBookDownloadName('  读者 "特刊"  ', "epub")).toBe("读者 _特刊_.epub");
  });

  it("falls back to a generic name when the title is empty", async () => {
    const { buildBookDownloadName } = await import("./route");

    expect(buildBookDownloadName("   ", "epub")).toBe("book.epub");
  });
});

describe("buildBookDownloadAsciiName", () => {
  it("removes non-ascii characters for the legacy filename fallback", async () => {
    const { buildBookDownloadAsciiName } = await import("./route");

    expect(buildBookDownloadAsciiName("测试书名", "epub")).toBe("book.epub");
  });
});

describe("Book file API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: { id: "user-1", username: "test", email: "test@test.com" },
      expires: new Date().toISOString(),
    });
    mockFindFirst.mockResolvedValue({
      id: "book-1",
      title: "测试书名",
      filePath: "book-1.epub",
      format: "epub",
      uploaderId: "user-1",
    });
    mockBookFileExists.mockReturnValue(true);
    mockGetBookFilePath.mockReturnValue("/tmp/book-1.epub");
    mockStatSync.mockReturnValue({ size: 1234 });
    mockCreateReadStream.mockReturnValue(NodeReadable.from(["ok"]) as never);
  });

  it("returns 404 when the file disappears between existence check and stat", async () => {
    mockStatSync.mockImplementation(() => {
      const error = new Error("missing") as NodeJS.ErrnoException;
      error.code = "ENOENT";
      throw error;
    });

    const { GET } = await import("./route");
    const res = await GET(createRequest("/api/books/book-1/file"), {
      params: Promise.resolve({ id: "book-1" }),
    });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("文件不存在");
  });

  it("sets a safe download filename", async () => {
    const { GET } = await import("./route");
    const res = await GET(createRequest("/api/books/book-1/file"), {
      params: Promise.resolve({ id: "book-1" }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Disposition")).toContain('filename="book.epub"');
    expect(res.headers.get("Content-Disposition")).toContain("filename*=UTF-8''%E6%B5%8B%E8%AF%95%E4%B9%A6%E5%90%8D.epub");
  });
});
