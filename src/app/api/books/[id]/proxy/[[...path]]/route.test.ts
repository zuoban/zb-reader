import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getBookFilePath, bookFileExists } from "@/lib/storage";
import { getAuthUserId } from "@/lib/api-utils";
import JSZip from "jszip";
import fs from "fs";

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
  notFound: vi.fn((msg) => new Response(JSON.stringify({ error: msg }), { status: 404 })),
  serverError: vi.fn((msg) => new Response(JSON.stringify({ error: msg }), { status: 500 })),
}));

vi.mock("fs", () => ({
  default: {
    readFileSync: vi.fn(),
  },
}));

describe("EPUB Proxy API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns unauthorized if user is not logged in", async () => {
    (getAuthUserId as any).mockResolvedValue({ error: new Response(null, { status: 401 }) });
    const req = new NextRequest("http://localhost/api/books/1/proxy/test.html");
    const res = await GET(req, { params: Promise.resolve({ id: "1", path: ["test.html"] }) });
    expect(res.status).toBe(401);
  });

  it("returns 404 if book does not exist", async () => {
    (getAuthUserId as any).mockResolvedValue({ userId: "user1" });
    (db.query.books.findFirst as any).mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/books/1/proxy/test.html");
    const res = await GET(req, { params: Promise.resolve({ id: "1", path: ["test.html"] }) });
    expect(res.status).toBe(404);
  });

  it("serves a file from the epub zip", async () => {
    (getAuthUserId as any).mockResolvedValue({ userId: "user1" });
    (db.query.books.findFirst as any).mockResolvedValue({ id: "1", uploaderId: "user1", filePath: "book.epub" });
    (bookFileExists as any).mockReturnValue(true);
    (getBookFilePath as any).mockReturnValue("/path/to/book.epub");

    // Create a mock zip
    const zip = new JSZip();
    zip.file("test.html", "<html><body>Test</body></html>");
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
    (fs.readFileSync as any).mockReturnValue(zipBuffer);

    const req = new NextRequest("http://localhost/api/books/1/proxy/test.html");
    const res = await GET(req, { params: Promise.resolve({ id: "1", path: ["test.html"] }) });

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/html");
    const text = await res.text();
    expect(text).toBe("<html><body>Test</body></html>");
  });

  it("returns 404 if file is not in zip", async () => {
    (getAuthUserId as any).mockResolvedValue({ userId: "user1" });
    (db.query.books.findFirst as any).mockResolvedValue({ id: "1", uploaderId: "user1", filePath: "book.epub" });
    (bookFileExists as any).mockReturnValue(true);
    (getBookFilePath as any).mockReturnValue("/path/to/book.epub");

    const zip = new JSZip();
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
    (fs.readFileSync as any).mockReturnValue(zipBuffer);

    const req = new NextRequest("http://localhost/api/books/1/proxy/nonexistent.html");
    const res = await GET(req, { params: Promise.resolve({ id: "1", path: ["nonexistent.html"] }) });

    expect(res.status).toBe(404);
  });

  it("returns 200 for root path", async () => {
    (getAuthUserId as any).mockResolvedValue({ userId: "user1" });
    const req = new NextRequest("http://localhost/api/books/1/proxy/");
    const res = await GET(req, { params: Promise.resolve({ id: "1", path: undefined }) });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("EPUB Proxy Root");
  });
});
