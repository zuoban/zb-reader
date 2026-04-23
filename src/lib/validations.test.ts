import { describe, expect, it } from "vitest";
import { progressSchema } from "@/lib/validations";

describe("progressSchema", () => {
  it("accepts sync payloads with nullable page fields", () => {
    const result = progressSchema.safeParse({
      bookId: "0f4f7a72-0b99-4f1d-80f8-63a704eb0b1d",
      clientVersion: 2,
      progress: 0.42,
      location: "epubcfi(/6/2!/4/2/1:0)",
      scrollRatio: null,
      readingDuration: 120,
      deviceId: "desktop-device",
      clientTimestamp: "2026-04-23T08:00:00.000Z",
      currentPage: null,
      totalPages: null,
    });

    expect(result.success).toBe(true);
  });

  it("rejects out-of-range progress values", () => {
    const result = progressSchema.safeParse({
      bookId: "0f4f7a72-0b99-4f1d-80f8-63a704eb0b1d",
      clientVersion: 1,
      progress: 1.2,
    });

    expect(result.success).toBe(false);
  });
});
