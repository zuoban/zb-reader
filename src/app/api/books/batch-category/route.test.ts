import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockAuth = vi.fn();
const mockUpdate = vi.fn();
const mockSet = vi.fn();
const mockWhere = vi.fn();
const mockInvalidateBookFacets = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    update: () => mockUpdate(),
  },
}));

vi.mock("@/lib/book-facets-cache", () => ({
  invalidateBookFacets: (...args: unknown[]) => mockInvalidateBookFacets(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

function createPatchRequest(body: unknown): NextRequest {
  return new NextRequest(new URL("/api/books/batch-category", "http://localhost:3000"), {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function mockAuthenticatedUser() {
  mockAuth.mockResolvedValue({
    user: { id: "user-1", username: "test", email: "test@test.com" },
    expires: new Date().toISOString(),
  });
}

describe("PATCH /api/books/batch-category", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticatedUser();
    mockUpdate.mockReturnValue({
      set: mockSet.mockReturnValue({
        where: mockWhere.mockResolvedValue({ changes: 2 }),
      }),
    });
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const { PATCH } = await import("./route");
    const res = await PATCH(createPatchRequest({ bookIds: ["book-1"], category: "技术" }));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("未登录");
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("rejects an empty book list", async () => {
    const { PATCH } = await import("./route");
    const res = await PATCH(createPatchRequest({ bookIds: [], category: "技术" }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("请选择要设置分类的书籍");
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("saves a trimmed category for selected books", async () => {
    const { PATCH } = await import("./route");
    const res = await PATCH(
      createPatchRequest({ bookIds: ["book-1", "book-2", "book-1"], category: " 技术 " })
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ updatedCount: 2, category: "技术" });
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ category: "技术" })
    );
    expect(mockInvalidateBookFacets).toHaveBeenCalledWith("user-1");
  });

  it("clears the category when category is blank", async () => {
    const { PATCH } = await import("./route");
    const res = await PATCH(
      createPatchRequest({ bookIds: ["book-1", "book-2"], category: "   " })
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ updatedCount: 2, category: null });
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ category: null })
    );
  });

  it("returns 404 when no owned books were updated", async () => {
    mockWhere.mockResolvedValueOnce({ changes: 0 });

    const { PATCH } = await import("./route");
    const res = await PATCH(createPatchRequest({ bookIds: ["book-9"], category: "技术" }));
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("书籍不存在");
    expect(mockInvalidateBookFacets).not.toHaveBeenCalled();
  });
});
