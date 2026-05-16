import { describe, expect, it } from "vitest";
import {
  batchBookCategorySchema,
  bookmarkUpdateSchema,
  bookCategorySchema,
  categoryDeleteSchema,
  categoryRenameSchema,
  noteUpdateSchema,
  progressSchema,
  readerSettingsSchema,
  ttsConfigImportSchema,
  ttsConfigUpdateSchema,
  ttsSpeakSchema,
  userUpdateSchema,
} from "@/lib/validations";

describe("progressSchema", () => {
  it("accepts sync payloads with nullable page fields", () => {
    const result = progressSchema.safeParse({
      bookId: "0f4f7a72-0b99-4f1d-80f8-63a704eb0b1d",
      progress: 0.42,
      location: "epubcfi(/6/2!/4/2/1:0)",
      clientUpdatedAt: "2026-05-10T12:00:00.000Z",
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid client sync timestamps", () => {
    const result = progressSchema.safeParse({
      bookId: "0f4f7a72-0b99-4f1d-80f8-63a704eb0b1d",
      clientUpdatedAt: "not-a-date",
    });

    expect(result.success).toBe(false);
  });

  it("rejects out-of-range progress values", () => {
    const result = progressSchema.safeParse({
      bookId: "0f4f7a72-0b99-4f1d-80f8-63a704eb0b1d",
      progress: 1.2,
    });

    expect(result.success).toBe(false);
  });

  it("rejects excessively long reading locations", () => {
    const result = progressSchema.safeParse({
      bookId: "0f4f7a72-0b99-4f1d-80f8-63a704eb0b1d",
      location: "a".repeat(4001),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("阅读位置不能超过 4000 个字符");
    }
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

describe("book category schemas", () => {
  it("trims single-book category values", () => {
    const result = bookCategorySchema.safeParse({
      category: " 技术 ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.category).toBe("技术");
    }
  });

  it("rejects single-book categories over 40 characters after trimming", () => {
    const result = bookCategorySchema.safeParse({
      category: ` ${"a".repeat(41)} `,
    });

    expect(result.success).toBe(false);
  });

  it("trims category rename values", () => {
    const result = categoryRenameSchema.safeParse({
      oldName: " 旧分类 ",
      newName: " 新分类 ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.oldName).toBe("旧分类");
      expect(result.data.newName).toBe("新分类");
    }
  });

  it("trims category delete names", () => {
    const result = categoryDeleteSchema.safeParse({
      name: " 技术 ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("技术");
    }
  });

  it("trims batch category values and keeps selected book ids", () => {
    const result = batchBookCategorySchema.safeParse({
      bookIds: ["book-1", "book-2", "book-1"],
      category: " 技术 ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.bookIds).toEqual(["book-1", "book-2", "book-1"]);
      expect(result.data.category).toBe("技术");
    }
  });

  it("rejects an empty batch book list", () => {
    const result = batchBookCategorySchema.safeParse({
      bookIds: [],
      category: "技术",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("请选择要设置分类的书籍");
    }
  });

  it("rejects batch categories over 40 characters after trimming", () => {
    const result = batchBookCategorySchema.safeParse({
      bookIds: ["book-1"],
      category: ` ${"a".repeat(41)} `,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("分类名称不能超过 40 个字符");
    }
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

describe("ttsConfigImportSchema", () => {
  it("accepts Legado-style config arrays", () => {
    const result = ttsConfigImportSchema.safeParse([
      {
        name: "测试语音",
        url: "https://example.com/tts?text={{speakText}}",
        header: "{\"User-Agent\":\"ZB Reader\"}",
        concurrentRate: "2",
      },
    ]);

    expect(result.success).toBe(true);
  });
});

describe("ttsConfigUpdateSchema", () => {
  it("requires name and url", () => {
    const result = ttsConfigUpdateSchema.safeParse({
      name: "",
      url: "",
    });

    expect(result.success).toBe(false);
  });
});

describe("ttsSpeakSchema", () => {
  it("accepts complete speak requests", () => {
    const result = ttsSpeakSchema.safeParse({
      configId: "config-1",
      text: "你好",
      speakSpeed: "1.2",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.speakSpeed).toBe(1.2);
    }
  });

  it("rejects missing text", () => {
    const result = ttsSpeakSchema.safeParse({
      configId: "config-1",
    });

    expect(result.success).toBe(false);
  });
});
