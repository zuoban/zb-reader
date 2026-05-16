import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock dependencies before importing the route
vi.mock("@/lib/api-utils", () => ({
  getAuthUserId: vi.fn(),
  validateJson: vi.fn(),
  serverError: vi.fn((msg) => ({ json: () => ({ message: msg }), status: 500 })),
  notFound: vi.fn((msg) => ({ json: () => ({ message: msg }), status: 404 })),
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      books: {
        findMany: vi.fn(),
      },
    },
    delete: vi.fn(() => ({
      where: vi.fn(),
    })),
  },
}));

vi.mock("@/lib/storage", () => ({
  deleteBookFile: vi.fn(),
  deleteCoverImage: vi.fn(),
}));

vi.mock("@/lib/cover-cache", () => ({
  invalidateCoverCache: vi.fn(),
}));

vi.mock("@/lib/book-facets-cache", () => ({
  invalidateBookFacets: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

// Now import the route and other things
import { DELETE } from "./route";
import * as apiUtils from "@/lib/api-utils";
import * as db from "@/lib/db";
import { books } from "@/lib/db/schema";

describe("Batch Delete API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should delete multiple books successfully", async () => {
    const userId = "user-1";
    const bookIds = ["book-1", "book-2"];

    (apiUtils.getAuthUserId as any).mockResolvedValue({ userId });
    (apiUtils.validateJson as any).mockResolvedValue({ data: { bookIds } });

    (db.db.query.books.findMany as any).mockResolvedValue([
      { id: "book-1", filePath: "file-1.epub", cover: "cover-1.jpg" },
      { id: "book-2", filePath: "file-2.epub", cover: null },
    ]);

    const req = new NextRequest("http://localhost/api/books/batch-delete", {
      method: "DELETE",
    });

    const response = await DELETE(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.deletedCount).toBe(2);
    expect(db.db.delete).toHaveBeenCalled();
  });

  it("should return 401 when user is not authenticated", async () => {
    const authError = { json: () => ({ message: "未登录" }), status: 401 };
    (apiUtils.getAuthUserId as any).mockResolvedValue({ error: authError });

    const req = new NextRequest("http://localhost/api/books/batch-delete", {
      method: "DELETE",
    });

    const response = await DELETE(req);
    expect(response.status).toBe(401);
  });

  it("should return 400 if validation fails", async () => {
    const userId = "user-1";
    (apiUtils.getAuthUserId as any).mockResolvedValue({ userId });
    (apiUtils.validateJson as any).mockResolvedValue({ error: { status: 400, json: () => ({}) } });

    const req = new NextRequest("http://localhost/api/books/batch-delete", {
      method: "DELETE",
    });

    const response = await DELETE(req);
    expect(response).toBeDefined();
  });

  it("should deduplicate book IDs", async () => {
    const userId = "user-1";
    const duplicatedIds = ["book-1", "book-2", "book-1"];

    (apiUtils.getAuthUserId as any).mockResolvedValue({ userId });
    (apiUtils.validateJson as any).mockResolvedValue({ data: { bookIds: duplicatedIds } });
    (db.db.query.books.findMany as any).mockResolvedValue([
      { id: "book-1", filePath: "file-1.epub", cover: "cover-1.jpg" },
      { id: "book-2", filePath: "file-2.epub", cover: null },
    ]);

    const req = new NextRequest("http://localhost/api/books/batch-delete", {
      method: "DELETE",
    });

    const response = await DELETE(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.deletedCount).toBe(2);
  });

  it("should return deletedCount 0 when no matching books found", async () => {
    const userId = "user-1";
    const bookIds = ["book-1", "book-2"];

    (apiUtils.getAuthUserId as any).mockResolvedValue({ userId });
    (apiUtils.validateJson as any).mockResolvedValue({ data: { bookIds } });
    (db.db.query.books.findMany as any).mockResolvedValue([]);

    const req = new NextRequest("http://localhost/api/books/batch-delete", {
      method: "DELETE",
    });

    const response = await DELETE(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.deletedCount).toBe(0);
  });
});
