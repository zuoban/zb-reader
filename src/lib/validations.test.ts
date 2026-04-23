import { describe, expect, it } from "vitest";
import {
  bookmarkUpdateSchema,
  noteUpdateSchema,
  progressSchema,
  readerSettingsSchema,
  userUpdateSchema,
} from "@/lib/validations";

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

describe("bookmarkUpdateSchema", () => {
  it("rejects labels over 100 characters", () => {
    const result = bookmarkUpdateSchema.safeParse({
      label: "a".repeat(101),
    });

    expect(result.success).toBe(false);
  });
});

describe("noteUpdateSchema", () => {
  it("rejects content over 5000 characters", () => {
    const result = noteUpdateSchema.safeParse({
      content: "a".repeat(5001),
    });

    expect(result.success).toBe(false);
  });
});

describe("readerSettingsSchema", () => {
  it("accepts numeric strings from form-like payloads", () => {
    const result = readerSettingsSchema.safeParse({
      fontSize: "18",
      ttsRate: "1.25",
      ttsPitch: "1.1",
      ttsVolume: "0.8",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fontSize).toBe(18);
      expect(result.data.ttsRate).toBe(1.25);
    }
  });

  it("rejects unsupported themes", () => {
    const result = readerSettingsSchema.safeParse({
      theme: "blue",
    });

    expect(result.success).toBe(false);
  });
});

describe("userUpdateSchema", () => {
  it("uses Chinese validation message for short usernames", () => {
    const result = userUpdateSchema.safeParse({
      username: "a",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("用户名长度应在 2-20 个字符之间");
    }
  });

  it("uses Chinese validation message for invalid emails", () => {
    const result = userUpdateSchema.safeParse({
      email: "invalid-email",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("邮箱格式不正确");
    }
  });
});
