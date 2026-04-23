import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api-utils", () => ({
  getAuthUserId: vi.fn(),
  serverError: vi.fn(),
  validateJson: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {},
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe("clampReaderSettingNumber", () => {
  it("clamps values to the configured range", async () => {
    const { clampReaderSettingNumber } = await import("./route");

    expect(clampReaderSettingNumber(8, 12, 28, 16)).toBe(12);
    expect(clampReaderSettingNumber(40, 12, 28, 16)).toBe(28);
  });

  it("accepts numeric strings", async () => {
    const { clampReaderSettingNumber } = await import("./route");

    expect(clampReaderSettingNumber("18", 12, 28, 16)).toBe(18);
  });

  it("falls back for non-finite values", async () => {
    const { clampReaderSettingNumber } = await import("./route");

    expect(clampReaderSettingNumber("abc", 12, 28, 16)).toBe(16);
    expect(clampReaderSettingNumber(Number.POSITIVE_INFINITY, 12, 28, 16)).toBe(16);
  });
});

describe("normalizeMicrosoftPreloadCount", () => {
  it("keeps allowed preload counts", async () => {
    const { normalizeMicrosoftPreloadCount } = await import("./route");

    expect(normalizeMicrosoftPreloadCount("8", 5)).toBe(8);
  });

  it("falls back for unsupported preload counts", async () => {
    const { normalizeMicrosoftPreloadCount } = await import("./route");

    expect(normalizeMicrosoftPreloadCount(4, 5)).toBe(5);
    expect(normalizeMicrosoftPreloadCount("abc", 5)).toBe(5);
  });
});
