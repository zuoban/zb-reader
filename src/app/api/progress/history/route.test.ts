import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockAuth = vi.fn();
const mockLimit = vi.fn();
const mockOrderBy = vi.fn();
const mockWhere = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({
      from: mockFrom,
    }),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

function createRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"));
}

describe("normalizeProgressHistoryLimit", () => {
  it("falls back to the default for missing or invalid values", async () => {
    const { normalizeProgressHistoryLimit } = await import("./route");

    expect(normalizeProgressHistoryLimit(null)).toBe(50);
    expect(normalizeProgressHistoryLimit("abc")).toBe(50);
    expect(normalizeProgressHistoryLimit("0")).toBe(50);
    expect(normalizeProgressHistoryLimit("-10")).toBe(50);
  });

  it("caps values to the maximum history size", async () => {
    const { normalizeProgressHistoryLimit } = await import("./route");

    expect(normalizeProgressHistoryLimit("999")).toBe(50);
  });

  it("keeps valid positive values", async () => {
    const { normalizeProgressHistoryLimit } = await import("./route");

    expect(normalizeProgressHistoryLimit("20")).toBe(20);
  });
});

describe("Progress history API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: { id: "user-1", username: "test", email: "test@test.com" },
      expires: new Date().toISOString(),
    });
    mockLimit.mockResolvedValue([]);
    mockOrderBy.mockReturnValue({ limit: mockLimit });
    mockWhere.mockReturnValue({ orderBy: mockOrderBy });
    mockFrom.mockReturnValue({ where: mockWhere });
  });

  it("returns 400 when bookId is missing", async () => {
    const { GET } = await import("./route");
    const res = await GET(createRequest("/api/progress/history"));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("缺少 bookId 参数");
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("uses the normalized limit for history queries", async () => {
    const { GET } = await import("./route");
    const res = await GET(createRequest("/api/progress/history?bookId=book-1&limit=-5"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ history: [], total: 0 });
    expect(mockLimit).toHaveBeenCalledWith(50);
  });
});
