import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockAuth = vi.fn();
const mockSyncReadingProgressItem = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/lib/progress-sync-service", () => ({
  syncReadingProgressItem: (...args: unknown[]) => mockSyncReadingProgressItem(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

function createRequest(body: unknown): NextRequest {
  return new NextRequest(new URL("/api/progress/sync", "http://localhost:3000"), {
    method: "POST",
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

describe("Progress sync API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticatedUser();
    mockSyncReadingProgressItem.mockResolvedValue("updated");
  });

  it("rejects invalid progress values before syncing", async () => {
    const { POST } = await import("./route");
    const res = await POST(
      createRequest({
        bookId: "0f4f7a72-0b99-4f1d-80f8-63a704eb0b1d",
        progress: 1.5,
      })
    );

    expect(res.status).toBe(400);
    expect(mockSyncReadingProgressItem).not.toHaveBeenCalled();
  });

  it("rejects excessively long locations before syncing", async () => {
    const { POST } = await import("./route");
    const res = await POST(
      createRequest({
        bookId: "0f4f7a72-0b99-4f1d-80f8-63a704eb0b1d",
        location: "a".repeat(4001),
      })
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("阅读位置不能超过 4000 个字符");
    expect(mockSyncReadingProgressItem).not.toHaveBeenCalled();
  });

  it("returns not found when the book is not owned by the user", async () => {
    mockSyncReadingProgressItem.mockResolvedValue("not_found");

    const { POST } = await import("./route");
    const res = await POST(
      createRequest({
        bookId: "0f4f7a72-0b99-4f1d-80f8-63a704eb0b1d",
        progress: 0.5,
      })
    );
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("书籍不存在");
  });

  it("syncs valid progress payloads", async () => {
    const payload = {
      bookId: "0f4f7a72-0b99-4f1d-80f8-63a704eb0b1d",
      progress: 0.5,
      location: "epubcfi(/6/2!/4/2/1:0)",
    };

    const { POST } = await import("./route");
    const res = await POST(createRequest(payload));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(mockSyncReadingProgressItem).toHaveBeenCalledWith("user-1", payload);
    expect(data.status).toBe("updated");
  });
});
