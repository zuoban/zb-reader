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
    error: vi.fn(),
  },
}));

function createRequest(body: unknown): NextRequest {
  return new NextRequest(new URL("/api/progress/batch-sync", "http://localhost:3000"), {
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

function createProgressItem(bookId: string) {
  return {
    bookId,
    progress: 0.5,
    location: "epubcfi(/6/2!/4/2/1:0)",
  };
}

describe("Progress batch sync API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticatedUser();
    mockSyncReadingProgressItem.mockResolvedValue("updated");
  });

  it("rejects empty batches", async () => {
    const { POST } = await import("./route");
    const res = await POST(createRequest([]));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("同步列表不能为空");
    expect(mockSyncReadingProgressItem).not.toHaveBeenCalled();
  });

  it("rejects batches over the maximum size", async () => {
    const items = Array.from({ length: 101 }, (_, index) =>
      createProgressItem(`0f4f7a72-0b99-4f1d-80f8-${index.toString().padStart(12, "0")}`)
    );

    const { POST } = await import("./route");
    const res = await POST(createRequest(items));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("一次最多同步 100 条进度");
    expect(mockSyncReadingProgressItem).not.toHaveBeenCalled();
  });

  it("syncs valid batches", async () => {
    const item = createProgressItem("0f4f7a72-0b99-4f1d-80f8-63a704eb0b1d");

    const { POST } = await import("./route");
    const res = await POST(createRequest([item]));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(mockSyncReadingProgressItem).toHaveBeenCalledWith("user-1", item);
    expect(data.results).toEqual([
      {
        bookId: item.bookId,
        status: "updated",
      },
    ]);
  });
});
