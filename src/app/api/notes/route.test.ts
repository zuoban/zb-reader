import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockAuth = vi.fn();
const mockFindFirst = vi.fn();
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();
const mockInsert = vi.fn();
const mockValues = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      notes: {
        findFirst: () => mockFindFirst(),
      },
    },
    select: () => mockSelect(),
    insert: () => mockInsert(),
  },
}));

function createRequest(url: string, body?: unknown): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: body ? "POST" : "GET",
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { "Content-Type": "application/json" } : undefined,
  });
}

describe("Notes API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/notes", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const { GET } = await import("./route");
      const req = createRequest("/api/notes?bookId=book-1");
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
      const req = createRequest("/api/notes");
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe("缺少 bookId 参数");
    });

    it("should return notes when authenticated", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", username: "test", email: "test@test.com" },
        expires: new Date().toISOString(),
      });

      const mockNotes = [
        {
          id: "note-1",
          userId: "user-1",
          bookId: "book-1",
          location: "chapter-3",
          selectedText: "Important text",
          content: "This is a note",
          color: "yellow",
          pageNumber: 100,
          progress: 50.5,
          createdAt: "2024-01-01 00:00:00",
          updatedAt: "2024-01-01 00:00:00",
        },
      ];

      mockSelect.mockReturnValue({
        from: mockFrom.mockReturnValue({
          where: mockWhere.mockReturnValue({
            orderBy: mockOrderBy.mockResolvedValue(mockNotes),
          }),
        }),
      });

      const { GET } = await import("./route");
      const req = createRequest("/api/notes?bookId=book-1");
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.notes).toEqual(mockNotes);
    });

    it("should return empty array when no notes found", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", username: "test", email: "test@test.com" },
        expires: new Date().toISOString(),
      });

      mockSelect.mockReturnValue({
        from: mockFrom.mockReturnValue({
          where: mockWhere.mockReturnValue({
            orderBy: mockOrderBy.mockResolvedValue([]),
          }),
        }),
      });

      const { GET } = await import("./route");
      const req = createRequest("/api/notes?bookId=book-1");
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.notes).toEqual([]);
    });
  });

  describe("POST /api/notes", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const { POST } = await import("./route");
      const req = createRequest("/api/notes", {
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
      const req = createRequest("/api/notes", {});
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(res.status).toBe(400);
      expect(data.error).toContain("Invalid input");
    });

    it("should create note successfully", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", username: "test", email: "test@test.com" },
        expires: new Date().toISOString(),
      });

      const mockNote = {
        id: "note-1",
        userId: "user-1",
        bookId: "book-1",
        location: "chapter-1",
        selectedText: "Important text",
        content: "This is a note",
        color: "yellow",
        pageNumber: 10,
        progress: 25.5,
        createdAt: "2024-01-01 00:00:00",
        updatedAt: "2024-01-01 00:00:00",
      };

      mockInsert.mockReturnValue({
        values: mockValues.mockResolvedValue(undefined),
      });

      mockFindFirst.mockResolvedValue(mockNote);

      const { POST } = await import("./route");
      const req = createRequest("/api/notes", {
        bookId: "book-1",
        location: "chapter-1",
        selectedText: "Important text",
        content: "This is a note",
        color: "yellow",
        pageNumber: 10,
        progress: 25.5,
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.note).toEqual(mockNote);
    });

    it("should create note with default color", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", username: "test", email: "test@test.com" },
        expires: new Date().toISOString(),
      });

      const mockNote = {
        id: "note-1",
        userId: "user-1",
        bookId: "book-1",
        location: "chapter-1",
        selectedText: null,
        content: "Simple note",
        color: "yellow",
        pageNumber: null,
        progress: null,
        createdAt: "2024-01-01 00:00:00",
        updatedAt: "2024-01-01 00:00:00",
      };

      mockInsert.mockReturnValue({
        values: mockValues.mockResolvedValue(undefined),
      });

      mockFindFirst.mockResolvedValue(mockNote);

      const { POST } = await import("./route");
      const req = createRequest("/api/notes", {
        bookId: "book-1",
        location: "chapter-1",
        content: "Simple note",
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.note.color).toBe("yellow");
    });

    it("should handle location as object", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", username: "test", email: "test@test.com" },
        expires: new Date().toISOString(),
      });

      const mockNote = {
        id: "note-1",
        userId: "user-1",
        bookId: "book-1",
        location: JSON.stringify({ chapter: 1, page: 10 }),
        selectedText: null,
        content: "Note with object location",
        color: "yellow",
        pageNumber: null,
        progress: null,
        createdAt: "2024-01-01 00:00:00",
        updatedAt: "2024-01-01 00:00:00",
      };

      mockInsert.mockReturnValue({
        values: mockValues.mockResolvedValue(undefined),
      });

      mockFindFirst.mockResolvedValue(mockNote);

      const { POST } = await import("./route");
      const req = createRequest("/api/notes", {
        bookId: "book-1",
        location: { chapter: 1, page: 10 },
        content: "Note with object location",
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.note).toBeDefined();
    });
  });
});
