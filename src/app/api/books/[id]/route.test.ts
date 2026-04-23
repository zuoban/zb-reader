import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockAuth = vi.fn();
const mockFindFirst = vi.fn();
const mockDelete = vi.fn();
const mockUpdate = vi.fn();
const mockSet = vi.fn();
const mockWhere = vi.fn();

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
    delete: () => mockDelete(),
    update: () => mockUpdate(),
  },
}));

vi.mock("@/lib/storage", () => ({
  deleteBookFile: vi.fn(),
  deleteCoverImage: vi.fn(),
}));

function createRequest(url: string, _params: { id: string }): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: "GET",
  });
}

function createPatchRequest(url: string, body: Record<string, unknown>): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("Book by ID API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/books/[id]", () => {
    it("should return 401 when not authenticated", { timeout: 15000 }, async () => {
      mockAuth.mockReturnValue(null);

      const { GET } = await import("./route");
      const req = createRequest("/api/books/book-1", { id: "book-1" });
      const res = await GET(req, { params: Promise.resolve({ id: "book-1" }) });

      expect(res.status).toBe(401);
    });

    it("should return book when found", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", username: "test", email: "test@test.com" },
        expires: new Date().toISOString(),
      });

      const mockBook = {
        id: "book-1",
        title: "Test Book",
        author: "Test Author",
        cover: null,
        filePath: "book-1.epub",
        fileSize: 1024 * 1024 * 2,
        format: "epub",
        description: "A test book",
        isbn: null,
        publisher: null,
        publishDate: null,
        language: null,
        uploaderId: "user-1",
        createdAt: "2024-01-01 00:00:00",
        updatedAt: "2024-01-01 00:00:00",
      };

      mockFindFirst.mockResolvedValue(mockBook);

      const { GET } = await import("./route");
      const req = createRequest("/api/books/book-1", { id: "book-1" });
      const res = await GET(req, { params: Promise.resolve({ id: "book-1" }) });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.book).toEqual(mockBook);
    });

    it("should return 404 when book not found", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", username: "test", email: "test@test.com" },
        expires: new Date().toISOString(),
      });

      mockFindFirst.mockResolvedValue(undefined);

      const { GET } = await import("./route");
      const req = createRequest("/api/books/book-1", { id: "book-1" });
      const res = await GET(req, { params: Promise.resolve({ id: "book-1" }) });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toBe("书籍不存在");
    });

    it("should only return books owned by user", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", username: "test", email: "test@test.com" },
        expires: new Date().toISOString(),
      });

      mockFindFirst.mockResolvedValue(undefined);

      const { GET } = await import("./route");
      const req = createRequest("/api/books/book-2", { id: "book-2" });
      const res = await GET(req, { params: Promise.resolve({ id: "book-2" }) });

      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/books/[id]", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const { DELETE } = await import("./route");
      const req = createRequest("/api/books/book-1", { id: "book-1" });
      const res = await DELETE(req, { params: Promise.resolve({ id: "book-1" }) });
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe("未登录");
    });

    it("should delete book successfully", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", username: "test", email: "test@test.com" },
        expires: new Date().toISOString(),
      });

      const mockBook = {
        id: "book-1",
        title: "Test Book",
        author: "Test Author",
        cover: "book-1.jpg",
        filePath: "book-1.epub",
        fileSize: 1024 * 1024 * 2,
        format: "epub",
        description: null,
        isbn: null,
        publisher: null,
        publishDate: null,
        language: null,
        uploaderId: "user-1",
        createdAt: "2024-01-01 00:00:00",
        updatedAt: "2024-01-01 00:00:00",
      };

      mockFindFirst.mockResolvedValue(mockBook);
      mockDelete.mockReturnValue({
        where: mockWhere.mockResolvedValue(undefined),
      });

      const { DELETE } = await import("./route");
      const req = createRequest("/api/books/book-1", { id: "book-1" });
      const res = await DELETE(req, { params: Promise.resolve({ id: "book-1" }) });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.message).toBe("删除成功");
    });

    it("should return 404 when book not found", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", username: "test", email: "test@test.com" },
        expires: new Date().toISOString(),
      });

      mockFindFirst.mockResolvedValue(undefined);

      const { DELETE } = await import("./route");
      const req = createRequest("/api/books/book-1", { id: "book-1" });
      const res = await DELETE(req, { params: Promise.resolve({ id: "book-1" }) });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toBe("书籍不存在");
    });

    it("should not allow deleting other user books", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", username: "test", email: "test@test.com" },
        expires: new Date().toISOString(),
      });

      mockFindFirst.mockResolvedValue(undefined);

      const { DELETE } = await import("./route");
      const req = createRequest("/api/books/book-2", { id: "book-2" });
      const res = await DELETE(req, { params: Promise.resolve({ id: "book-2" }) });

      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/books/[id]", () => {
    it("should update category successfully", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", username: "test", email: "test@test.com" },
        expires: new Date().toISOString(),
      });

      const existingBook = {
        id: "book-1",
        title: "Test Book",
        author: "Test Author",
        category: null,
        uploaderId: "user-1",
      };
      const updatedBook = { ...existingBook, category: "技术" };

      mockFindFirst.mockResolvedValueOnce(existingBook).mockResolvedValueOnce(updatedBook);
      mockUpdate.mockReturnValue({
        set: mockSet.mockReturnValue({
          where: mockWhere.mockResolvedValue(undefined),
        }),
      });

      const { PATCH } = await import("./route");
      const req = createPatchRequest("/api/books/book-1", { category: " 技术 " });
      const res = await PATCH(req, { params: Promise.resolve({ id: "book-1" }) });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.book.category).toBe("技术");
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ category: "技术" })
      );
    });

    it("should clear category when category is empty", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", username: "test", email: "test@test.com" },
        expires: new Date().toISOString(),
      });

      const existingBook = {
        id: "book-1",
        title: "Test Book",
        author: "Test Author",
        category: "技术",
        uploaderId: "user-1",
      };
      const updatedBook = { ...existingBook, category: null };

      mockFindFirst.mockResolvedValueOnce(existingBook).mockResolvedValueOnce(updatedBook);
      mockUpdate.mockReturnValue({
        set: mockSet.mockReturnValue({
          where: mockWhere.mockResolvedValue(undefined),
        }),
      });

      const { PATCH } = await import("./route");
      const req = createPatchRequest("/api/books/book-1", { category: " " });
      const res = await PATCH(req, { params: Promise.resolve({ id: "book-1" }) });

      expect(res.status).toBe(200);
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ category: null })
      );
    });

    it("should reject category names longer than 40 characters", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", username: "test", email: "test@test.com" },
        expires: new Date().toISOString(),
      });

      const { PATCH } = await import("./route");
      const req = createPatchRequest("/api/books/book-1", { category: "a".repeat(41) });
      const res = await PATCH(req, { params: Promise.resolve({ id: "book-1" }) });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe("分类名称不能超过 40 个字符");
    });
  });
});
