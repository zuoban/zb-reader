import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockAuth = vi.fn();
const mockFindFirst = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      readingProgress: {
        findFirst: (...args: unknown[]) => mockFindFirst(...args),
      },
    },
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

function mockAuthenticatedUser() {
  mockAuth.mockResolvedValue({
    user: { id: "user-1", username: "test", email: "test@test.com" },
    expires: new Date().toISOString(),
  });
}

describe("Progress API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticatedUser();
  });

  it("rejects missing bookId", async () => {
    const { GET } = await import("./route");
    const res = await GET(createRequest("/api/progress"));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("缺少 bookId 参数");
    expect(mockFindFirst).not.toHaveBeenCalled();
  });

  it("rejects invalid bookId before querying", async () => {
    const { GET } = await import("./route");
    const res = await GET(createRequest("/api/progress?bookId=not-a-uuid"));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("无效的书籍 ID");
    expect(mockFindFirst).not.toHaveBeenCalled();
  });

  it("returns saved progress for a valid bookId", async () => {
    mockFindFirst.mockResolvedValue({
      progress: 0.42,
      location: "epubcfi(/6/2!/4/2/1:0)",
    });

    const { GET } = await import("./route");
    const res = await GET(
      createRequest("/api/progress?bookId=0f4f7a72-0b99-4f1d-80f8-63a704eb0b1d")
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.progress).toEqual({
      progress: 0.42,
      location: "epubcfi(/6/2!/4/2/1:0)",
    });
  });
});
