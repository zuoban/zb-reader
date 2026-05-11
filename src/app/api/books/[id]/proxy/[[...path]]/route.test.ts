import { describe, it, expect, vi, beforeEach, type MockedFunction } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getBookFilePath, bookFileExists } from "@/lib/storage";
import { getAuthUserId } from "@/lib/api-utils";
import { extractFileFromZip } from "@/lib/zip-utils";

type MockFn = MockedFunction<(...args: unknown[]) => unknown>;

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      books: {
        findFirst: vi.fn(),
      },
    },
  },
}));

vi.mock("@/lib/storage", () => ({
  getBookFilePath: vi.fn(),
  bookFileExists: vi.fn(),
}));

vi.mock("@/lib/zip-utils", () => ({
  extractFileFromZip: vi.fn(),
}));

vi.mock("@/lib/api-utils", () => ({
  getAuthUserId: vi.fn(),
  badRequest: vi.fn((msg) => new Response(JSON.stringify({ error: msg }), { status: 400 })),
  notFound: vi.fn((msg) => new Response(JSON.stringify({ error: msg }), { status: 404 })),
  serverError: vi.fn((msg) => new Response(JSON.stringify({ error: msg }), { status: 500 })),
}));

describe("EPUB Proxy API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns unauthorized if user is not logged in", async () => {
    (getAuthUserId as MockFn).mockResolvedValue({ error: new Response(null, { status: 401 }) });
    const req = new NextRequest("http://localhost/api/books/1/proxy/test.html");
    const res = await GET(req, { params: Promise.resolve({ id: "1", path: ["test.html"] }) });
    expect(res.status).toBe(401);
  });

  it("returns 404 if book does not exist", async () => {
    (getAuthUserId as MockFn).mockResolvedValue({ userId: "user1" });
    (db.query.books.findFirst as MockFn).mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/books/1/proxy/test.html");
    const res = await GET(req, { params: Promise.resolve({ id: "1", path: ["test.html"] }) });
    expect(res.status).toBe(404);
  });

  it("serves a file from the epub zip", async () => {
    (getAuthUserId as MockFn).mockResolvedValue({ userId: "user1" });
    (db.query.books.findFirst as MockFn).mockResolvedValue({ id: "1", uploaderId: "user1", filePath: "book.epub" });
    (bookFileExists as MockFn).mockReturnValue(true);
    (getBookFilePath as MockFn).mockReturnValue("/path/to/book.epub");
    (extractFileFromZip as MockFn).mockResolvedValue(Buffer.from("<html><body>Test</body></html>"));

    const req = new NextRequest("http://localhost/api/books/1/proxy/test.html");
    const res = await GET(req, { params: Promise.resolve({ id: "1", path: ["test.html"] }) });

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/html");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    const text = await res.text();
    expect(text).toBe("<html><body>Test</body></html>");
    expect(extractFileFromZip).toHaveBeenCalledWith("/path/to/book.epub", "test.html");
  });

  it.each([
    [["..", "META-INF", "container.xml"]],
    [["http:", "example.com", "style.css"]],
    [["a\0b.css"]],
    [["OPS\\style.css"]],
    [["", "style.css"]],
  ])("rejects unsafe proxy paths: %j", async (path) => {
    (getAuthUserId as MockFn).mockResolvedValue({ userId: "user1" });
    const req = new NextRequest("http://localhost/api/books/1/proxy/unsafe");
    const res = await GET(req, { params: Promise.resolve({ id: "1", path }) });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("无效的文件路径");
    expect(db.query.books.findFirst).not.toHaveBeenCalled();
  });

  it("returns 404 if file is not in zip", async () => {
    (getAuthUserId as MockFn).mockResolvedValue({ userId: "user1" });
    (db.query.books.findFirst as MockFn).mockResolvedValue({ id: "1", uploaderId: "user1", filePath: "book.epub" });
    (bookFileExists as MockFn).mockReturnValue(true);
    (getBookFilePath as MockFn).mockReturnValue("/path/to/book.epub");
    (extractFileFromZip as MockFn).mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/books/1/proxy/nonexistent.html");
    const res = await GET(req, { params: Promise.resolve({ id: "1", path: ["nonexistent.html"] }) });

    expect(res.status).toBe(404);
  });

  it("returns 200 for root path", async () => {
    (getAuthUserId as MockFn).mockResolvedValue({ userId: "user1" });
    const req = new NextRequest("http://localhost/api/books/1/proxy/");
    const res = await GET(req, { params: Promise.resolve({ id: "1", path: undefined }) });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("EPUB Proxy Root");
  });
});
