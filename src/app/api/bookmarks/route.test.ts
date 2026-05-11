import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockAuth = vi.fn();
const mockBookFindFirst = vi.fn().mockResolvedValue({
  id: "book-1",
  uploaderId: "user-1",
});
const mockOrderBy = vi.fn(() => ({
  limit: vi.fn(() => ({
    offset: vi.fn().mockResolvedValue([]),
  })),
}));
const mockWhere = vi.fn(() => ({
  orderBy: mockOrderBy,
}));
const mockFrom = vi.fn(() => ({
  where: mockWhere,
}));
const mockSelect = vi.fn(() => ({
  from: mockFrom,
}));
const mockInsert = vi.fn(() => ({
  values: vi.fn().mockResolvedValue(undefined),
}));
const _mockFindFirst = vi.fn().mockResolvedValue(null);

vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: () => mockSelect(),
    insert: () => mockInsert(),
    query: {
      books: {
        findFirst: () => mockBookFindFirst(),
      },
      bookmarks: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    },
  },
}));

function createRequest(url: string, body?: unknown): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: body ? "POST" : "GET",
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { "Content-Type": "application/json" } : undefined,
  });
}

describe("Bookmarks API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBookFindFirst.mockResolvedValue({
      id: "book-1",
      uploaderId: "user-1",
    });
  });

  describe("GET /api/bookmarks", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const { GET } = await import("./route");
      const req = createRequest("/api/bookmarks?bookId=book-1");
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
      const req = createRequest("/api/bookmarks");
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe("缺少 bookId 参数");
    });

    it("should return bookmarks when authenticated", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", username: "test", email: "test@test.com" },
        expires: new Date().toISOString(),
      });

      const mockBookmarks = [
        {
          id: "bookmark-1",
          userId: "user-1",
          bookId: "book-1",
          location: "chapter-3",
          label: "Test Bookmark",
          pageNumber: 100,
          progress: 50.5,
          createdAt: "2024-01-01 00:00:00",
          updatedAt: "2024-01-01 00:00:00",
        },
      ];

      const mockOffset = vi.fn().mockResolvedValue(mockBookmarks);
      const mockLimit = vi.fn(() => ({ offset: mockOffset }));
      const mockOrderBy = vi.fn(() => ({ limit: mockLimit }));
      const mockWhere = vi.fn(() => ({ orderBy: mockOrderBy }));
      const mockFrom = vi.fn(() => ({ where: mockWhere }));
      mockSelect.mockReturnValueOnce({ from: mockFrom });

      const { GET } = await import("./route");
      const req = createRequest("/api/bookmarks?bookId=book-1");
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.bookmarks).toEqual(mockBookmarks);
    });
  });

  describe("POST /api/bookmarks", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const { POST } = await import("./route");
      const req = createRequest("/api/bookmarks", {
        bookId: "book-1",
        location: "chapter-1",
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe("未登录");
    });

    it("should return 400 when missing required parameters", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", username: "test", email: "test@test.com" },
        expires: new Date().toISOString(),
      });

      const { POST } = await import("./route");
      const req = createRequest("/api/bookmarks", {});
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain("Invalid input");
    });

    it("should create bookmark successfully", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", username: "test", email: "test@test.com" },
        expires: new Date().toISOString(),
      });

      const mockDb = vi.mocked(await import("@/lib/db")).db;
      const mockBookmark = {
        id: "bookmark-1",
        userId: "user-1",
        bookId: "book-1",
        location: "chapter-1",
        label: "Test Bookmark",
        pageNumber: 10,
        progress: 25.5,
        createdAt: "2024-01-01 00:00:00",
        updatedAt: "2024-01-01 00:00:00",
      };

      // First call: duplicate check → no existing bookmark
      // Second call: query created bookmark
      (mockDb.query.bookmarks.findFirst as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockBookmark);

      const { POST } = await import("./route");
      const req = createRequest("/api/bookmarks", {
        bookId: "book-1",
        location: "chapter-1",
        label: "Test Bookmark",
        pageNumber: 10,
        progress: 25.5,
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.bookmark).toEqual(mockBookmark);
    });
  });
});
