import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockRun = vi.fn();
const mockGet = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    run: mockRun,
    get: mockGet,
  },
}));

function createRequest() {
  return new NextRequest("http://localhost/api/test", {
    headers: {
      "x-forwarded-for": "203.0.113.10",
    },
  });
}

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockRun.mockRejectedValue(new Error("use fallback"));
    mockGet.mockRejectedValue(new Error("use fallback"));
  });

  it("allows exactly limit requests and rejects the next one", async () => {
    const { checkRateLimit } = await import("./rate-limit");

    await expect(checkRateLimit(createRequest(), { limit: 3, window: 60 })).resolves.toBeNull();
    await expect(checkRateLimit(createRequest(), { limit: 3, window: 60 })).resolves.toBeNull();
    await expect(checkRateLimit(createRequest(), { limit: 3, window: 60 })).resolves.toBeNull();

    const response = await checkRateLimit(createRequest(), { limit: 3, window: 60 });

    expect(response?.status).toBe(429);
  });
});
