import { describe, it, expect, vi, beforeEach, type MockedFunction } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getBookFilePath, bookFileExists } from "@/lib/storage";
import { getAuthUserId } from "@/lib/api-utils";
import { clearEpubZipCache } from "@/lib/server-epub-cache";
import JSZip from "jszip";
import fs from "fs";

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

vi.mock("@/lib/api-utils", () => ({
  getAuthUserId: vi.fn(),
  badRequest: vi.fn((msg) => new Response(JSON.stringify({ error: msg }), { status: 400 })),
  notFound: vi.fn((msg) => new Response(JSON.stringify({ error: msg }), { status: 404 })),
  serverError: vi.fn((msg) => new Response(JSON.stringify({ error: msg }), { status: 500 })),
}));

vi.mock("fs", () => ({
  default: {
    readFileSync: vi.fn(),
    statSync: vi.fn(),
  },
}));

describe("EPUB Proxy API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearEpubZipCache();
    (fs.statSync as MockFn).mockReturnValue({ mtimeMs: 1000, size: 1024 });
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

    // Create a mock zip
    const zip = new JSZip();
    zip.file("test.html", "<html><body>Test</body></html>");
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
    (fs.readFileSync as MockFn).mockReturnValue(zipBuffer);

    const req = new NextRequest("http://localhost/api/books/1/proxy/test.html");
    const res = await GET(req, { params: Promise.resolve({ id: "1", path: ["test.html"] }) });

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/html");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    const text = await res.text();
    expect(text).toBe("<html><body>Test</body></html>");
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

  it("reuses the cached zip for repeated requests to the same book file", async () => {
    (getAuthUserId as MockFn).mockResolvedValue({ userId: "user1" });
    (db.query.books.findFirst as MockFn).mockResolvedValue({ id: "1", uploaderId: "user1", filePath: "book.epub" });
    (bookFileExists as MockFn).mockReturnValue(true);
    (getBookFilePath as MockFn).mockReturnValue("/path/to/book.epub");

    const zip = new JSZip();
    zip.file("chapter-1.html", "<h1>一</h1>");
    zip.file("chapter-2.html", "<h1>二</h1>");
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
    (fs.readFileSync as MockFn).mockReturnValue(zipBuffer);

    const firstReq = new NextRequest("http://localhost/api/books/1/proxy/chapter-1.html");
    const firstRes = await GET(firstReq, { params: Promise.resolve({ id: "1", path: ["chapter-1.html"] }) });
    const secondReq = new NextRequest("http://localhost/api/books/1/proxy/chapter-2.html");
    const secondRes = await GET(secondReq, { params: Promise.resolve({ id: "1", path: ["chapter-2.html"] }) });

    expect(firstRes.status).toBe(200);
    expect(secondRes.status).toBe(200);
    expect(await firstRes.text()).toBe("<h1>一</h1>");
    expect(await secondRes.text()).toBe("<h1>二</h1>");
    expect(fs.readFileSync).toHaveBeenCalledTimes(1);
  });

  it("returns 404 if file is not in zip", async () => {
    (getAuthUserId as MockFn).mockResolvedValue({ userId: "user1" });
    (db.query.books.findFirst as MockFn).mockResolvedValue({ id: "1", uploaderId: "user1", filePath: "book.epub" });
    (bookFileExists as MockFn).mockReturnValue(true);
    (getBookFilePath as MockFn).mockReturnValue("/path/to/book.epub");

    const zip = new JSZip();
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
    (fs.readFileSync as MockFn).mockReturnValue(zipBuffer);

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
