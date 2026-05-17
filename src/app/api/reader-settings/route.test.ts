import { describe, expect, it, vi } from "vitest";
import {
  clampFontSize,
  clampPageWidth,
  clampTtsRate,
  clampTtsPitch,
  clampTtsVolume,
  clampLegadoRate,
  clampReaderSettingNumber,
  normalizeMicrosoftPreloadCount,
  isValidFontFamily,
} from "@/lib/utils";

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
  it("clamps values to the configured range", () => {
    expect(clampReaderSettingNumber(8, 12, 28, 16)).toBe(12);
    expect(clampReaderSettingNumber(40, 12, 28, 16)).toBe(28);
  });

  it("accepts numeric strings", () => {
    expect(clampReaderSettingNumber("18", 12, 28, 16)).toBe(18);
  });

  it("falls back for non-finite values", () => {
    expect(clampReaderSettingNumber("abc", 12, 28, 16)).toBe(16);
    expect(clampReaderSettingNumber(Number.POSITIVE_INFINITY, 12, 28, 16)).toBe(16);
  });
});

describe("normalizeMicrosoftPreloadCount", () => {
  it("keeps allowed preload counts", () => {
    expect(normalizeMicrosoftPreloadCount(8)).toBe(8);
    expect(normalizeMicrosoftPreloadCount(5)).toBe(5);
    expect(normalizeMicrosoftPreloadCount(3)).toBe(3);
  });

  it("falls back for unsupported preload counts", () => {
    expect(normalizeMicrosoftPreloadCount(4)).toBe(5);
    expect(normalizeMicrosoftPreloadCount(7)).toBe(5);
    expect(normalizeMicrosoftPreloadCount(0)).toBe(5);
  });
});

describe("shared clamp functions", () => {
  it("clampFontSize clamps to 12-28 range", () => {
    expect(clampFontSize(8)).toBe(12);
    expect(clampFontSize(40)).toBe(28);
    expect(clampFontSize(18)).toBe(18);
  });

  it("clampPageWidth clamps to 50-100 range", () => {
    expect(clampPageWidth(30)).toBe(50);
    expect(clampPageWidth(120)).toBe(100);
    expect(clampPageWidth(75)).toBe(75);
  });

  it("clampTtsRate clamps to 1-5 range", () => {
    expect(clampTtsRate(0.5)).toBe(1);
    expect(clampTtsRate(10)).toBe(5);
    expect(clampTtsRate(2)).toBe(2);
  });

  it("clampTtsPitch clamps to 0.5-2 range", () => {
    expect(clampTtsPitch(0.1)).toBe(0.5);
    expect(clampTtsPitch(3)).toBe(2);
    expect(clampTtsPitch(1)).toBe(1);
  });

  it("clampTtsVolume clamps to 0-1 range", () => {
    expect(clampTtsVolume(-1)).toBe(0);
    expect(clampTtsVolume(2)).toBe(1);
    expect(clampTtsVolume(0.5)).toBe(0.5);
  });

  it("clampLegadoRate clamps to 10-200 range", () => {
    expect(clampLegadoRate(5)).toBe(10);
    expect(clampLegadoRate(300)).toBe(200);
    expect(clampLegadoRate(50)).toBe(50);
  });

  it("isValidFontFamily validates font families", () => {
    expect(isValidFontFamily("system")).toBe(true);
    expect(isValidFontFamily("serif")).toBe(true);
    expect(isValidFontFamily("times")).toBe(false);
  });
});
