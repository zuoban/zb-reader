import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockAuth = vi.fn();
const mockFindFirst = vi.fn();
const mockInsert = vi.fn(() => ({
  values: vi.fn(() => ({
    onConflictDoUpdate: vi.fn(),
  })),
}));

vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      readingProgress: {
        findFirst: () => mockFindFirst(),
      },
    },
    insert: () => mockInsert(),
  },
}));

function createRequest(url: string, body?: unknown): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: body ? "PUT" : "GET",
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { "Content-Type": "application/json" } : undefined,
  });
}

describe("Progress API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/progress", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const { GET } = await import("./route");
      const req = createRequest("/api/progress?bookId=test-book");
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe("未登录");
    });

    it("should return 400 when bookId is missing", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", username: "test", email: "test@test.com" },
        expires: new Date().toISOString(),
      });

      const { GET } = await import("./route");
      const req = createRequest("/api/progress");
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe("缺少 bookId 参数");
    });

    it("should return progress when found", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", username: "test", email: "test@test.com" },
        expires: new Date().toISOString(),
      });

      const mockProgress = {
        id: "progress-1",
        userId: "user-1",
        bookId: "book-1",
        progress: 50.5,
        location: "chapter-3",
        currentPage: 100,
        totalPages: 200,
        lastReadAt: "2024-01-01 12:00:00",
        createdAt: "2024-01-01 12:00:00",
        updatedAt: "2024-01-01 12:00:00",
      };

      mockFindFirst.mockResolvedValue(mockProgress);

      const { GET } = await import("./route");
      const req = createRequest("/api/progress?bookId=book-1");
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.progress).toEqual(mockProgress);
    });

    it("should return null when progress not found", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", username: "test", email: "test@test.com" },
        expires: new Date().toISOString(),
      });

      mockFindFirst.mockResolvedValue(undefined);

      const { GET } = await import("./route");
      const req = createRequest("/api/progress?bookId=book-1");
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.progress).toBeNull();
    });

    it("should handle database errors", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", username: "test", email: "test@test.com" },
        expires: new Date().toISOString(),
      });

      mockFindFirst.mockRejectedValue(new Error("DB error"));

      const { GET } = await import("./route");
      const req = createRequest("/api/progress?bookId=book-1");
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe("获取进度失败");
    });
  });

  describe("PUT /api/progress", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const { PUT } = await import("./route");
      const req = createRequest("/api/progress", { bookId: "book-1" });
      const res = await PUT(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe("未登录");
    });

    it("should return 400 when bookId is missing", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", username: "test", email: "test@test.com" },
        expires: new Date().toISOString(),
      });

      const { PUT } = await import("./route");
      const req = createRequest("/api/progress", {});
      const res = await PUT(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe("缺少 bookId 参数");
    });

    it("should update progress successfully", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", username: "test", email: "test@test.com" },
        expires: new Date().toISOString(),
      });

      const mockOnConflict = vi.fn().mockResolvedValue(undefined);
      const mockValues = vi.fn(() => ({
        onConflictDoUpdate: mockOnConflict,
      }));
      mockInsert.mockReturnValue({
        values: mockValues,
      });

      const { PUT } = await import("./route");
      const req = createRequest("/api/progress", {
        bookId: "book-1",
        progress: 75.5,
        location: "chapter-5",
        currentPage: 150,
        totalPages: 200,
      });
      const res = await PUT(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.progress).toMatchObject({
        userId: "user-1",
        bookId: "book-1",
        progress: 75.5,
        location: "chapter-5",
        currentPage: 150,
        totalPages: 200,
      });
      expect(mockInsert).toHaveBeenCalled();
      expect(mockValues).toHaveBeenCalled();
      expect(mockOnConflict).toHaveBeenCalled();
    });
  });
});
