import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockAuth = vi.fn();
const mockFindFirst = vi.fn();
const mockUpdate = vi.fn();
const mockInsert = vi.fn(() => ({
  values: vi.fn().mockResolvedValue(undefined),
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
    update: () => mockUpdate(),
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

    it("should return progress with serverToken when found", async () => {
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
      expect(data.serverToken).toBeDefined();
      expect(typeof data.serverToken).toBe("string");
    });

    it("should return null when progress not found", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", username: "test", email: "test@test.com" },
        expires: new Date().toISOString(),
      });

      mockFindFirst.mockResolvedValue(null);

      const { GET } = await import("./route");
      const req = createRequest("/api/progress?bookId=book-1");
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.progress).toBeNull();
      expect(data.serverToken).toBeNull();
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
      const req = createRequest("/api/progress", { progress: 50 });
      const res = await PUT(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe("缺少 bookId 参数");
    });

    it("should return 400 when clientToken is missing", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", username: "test", email: "test@test.com" },
        expires: new Date().toISOString(),
      });

      const { PUT } = await import("./route");
      const req = createRequest("/api/progress", {
        bookId: "book-1",
        progress: 75.5,
      });
      const res = await PUT(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe("缺少 clientToken 参数");
    });

    it("should return 400 when clientToken is invalid", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", username: "test", email: "test@test.com" },
        expires: new Date().toISOString(),
      });

      const { PUT } = await import("./route");
      const req = createRequest("/api/progress", {
        bookId: "book-1",
        progress: 75.5,
        clientToken: "invalid-token",
      });
      const res = await PUT(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe("无效的 token");
    });

    it("should return 409 when token is outdated", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", username: "test", email: "test@test.com" },
        expires: new Date().toISOString(),
      });

      const mockProgress = {
        id: "progress-1",
        userId: "user-1",
        bookId: "book-1",
        progress: 50,
        updatedAt: "2024-01-01 12:00:00",
      };

      mockFindFirst.mockResolvedValue(mockProgress);

      const { generateToken } = await import("@/lib/progress-token");
      const oldToken = generateToken({
        userId: "user-1",
        bookId: "book-1",
        timestamp: "2024-01-01 11:00:00",
      });

      const { PUT } = await import("./route");
      const req = createRequest("/api/progress", {
        bookId: "book-1",
        progress: 75.5,
        clientToken: oldToken,
      });
      const res = await PUT(req);
      const data = await res.json();

      expect(res.status).toBe(409);
      expect(data.conflict).toBe(true);
      expect(data.latestTimestamp).toBe("2024-01-01 12:00:00");
    });

    it("should update progress successfully with valid token", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", username: "test", email: "test@test.com" },
        expires: new Date().toISOString(),
      });

      const mockProgress = {
        id: "progress-1",
        userId: "user-1",
        bookId: "book-1",
        progress: 50,
        updatedAt: "2024-01-01 11:00:00",
      };

      mockFindFirst.mockResolvedValue(mockProgress);

      const mockWhere = vi.fn().mockResolvedValue(undefined);
      mockUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: mockWhere,
        }),
      });

      const { generateToken } = await import("@/lib/progress-token");
      const newToken = generateToken({
        userId: "user-1",
        bookId: "book-1",
        timestamp: "2024-01-01 12:00:00",
      });

      const { PUT } = await import("./route");
      const req = createRequest("/api/progress", {
        bookId: "book-1",
        progress: 75.5,
        location: "chapter-5",
        currentPage: 150,
        totalPages: 200,
        clientToken: newToken,
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
    });

    it("should create new progress record when none exists", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", username: "test", email: "test@test.com" },
        expires: new Date().toISOString(),
      });

      mockFindFirst.mockResolvedValue(null);

      const { generateToken } = await import("@/lib/progress-token");
      const token = generateToken({
        userId: "user-1",
        bookId: "book-1",
        timestamp: "2024-01-01 12:00:00",
      });

      const { PUT } = await import("./route");
      const req = createRequest("/api/progress", {
        bookId: "book-1",
        progress: 50.5,
        clientToken: token,
      });
      const res = await PUT(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.progress).toMatchObject({
        userId: "user-1",
        bookId: "book-1",
        progress: 50.5,
      });
      expect(mockInsert).toHaveBeenCalled();
    });
  });
});
