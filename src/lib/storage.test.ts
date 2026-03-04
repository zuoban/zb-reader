import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import path from "path";
const mockFs = {
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
};

vi.mock("fs", () => ({
  default: mockFs,
  existsSync: mockFs.existsSync,
  mkdirSync: mockFs.mkdirSync,
  writeFileSync: mockFs.writeFileSync,
  unlinkSync: mockFs.unlinkSync,
}));

const mockProcessCwd = "/test/project";
vi.stubGlobal("process", {
  cwd: () => mockProcessCwd,
});

const DATA_DIR = path.join(mockProcessCwd, "data");
const BOOKS_DIR = path.join(DATA_DIR, "books");
const COVERS_DIR = path.join(DATA_DIR, "covers");

describe("Storage utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFs.existsSync.mockReturnValue(true);
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe("saveBookFile", () => {
    it("should save book file and return filename", async () => {
      const { saveBookFile } = await import("./storage");
      const buffer = Buffer.from("test content");
      const bookId = "test-book-id";
      const format = "epub";

      const result = saveBookFile(buffer, bookId, format);

      expect(result).toBe(`${bookId}.${format}`);
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        path.join(BOOKS_DIR, `${bookId}.${format}`),
        buffer
      );
    });

    it("should handle different formats", async () => {
      const { saveBookFile } = await import("./storage");
      const formats = ["epub"];

      formats.forEach((format) => {
        const buffer = Buffer.from("test");
        const result = saveBookFile(buffer, `book-${format}`, format);
        expect(result).toBe(`book-${format}.${format}`);
      });
    });
  });

  describe("deleteBookFile", () => {
    it("should delete existing file", async () => {
      const { deleteBookFile } = await import("./storage");
      mockFs.existsSync.mockReturnValue(true);

      deleteBookFile("test-book.epub");

      expect(mockFs.unlinkSync).toHaveBeenCalledWith(
        path.join(BOOKS_DIR, "test-book.epub")
      );
    });

    it("should not throw if file does not exist", async () => {
      const { deleteBookFile } = await import("./storage");
      mockFs.existsSync.mockReturnValue(false);

      expect(() => deleteBookFile("nonexistent.epub")).not.toThrow();
      expect(mockFs.unlinkSync).not.toHaveBeenCalled();
    });
  });

  describe("getBookFilePath", () => {
    it("should return correct path", async () => {
      const { getBookFilePath } = await import("./storage");
      const result = getBookFilePath("book.epub");
      expect(result).toBe(path.join(BOOKS_DIR, "book.epub"));
    });
  });

  describe("bookFileExists", () => {
    it("should return true if file exists", async () => {
      const { bookFileExists } = await import("./storage");
      mockFs.existsSync.mockReturnValue(true);

      const result = bookFileExists("book.epub");
      expect(result).toBe(true);
      expect(mockFs.existsSync).toHaveBeenCalledWith(
        path.join(BOOKS_DIR, "book.epub")
      );
    });

    it("should return false if file does not exist", async () => {
      const { bookFileExists } = await import("./storage");
      mockFs.existsSync.mockReturnValue(false);

      const result = bookFileExists("book.epub");
      expect(result).toBe(false);
    });
  });

  describe("saveCoverImage", () => {
    it("should save cover image with jpg extension", async () => {
      const { saveCoverImage } = await import("./storage");
      const buffer = Buffer.from("image data");
      const bookId = "test-book";

      const result = saveCoverImage(buffer, bookId);

      expect(result).toBe(`${bookId}.jpg`);
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        path.join(COVERS_DIR, `${bookId}.jpg`),
        buffer
      );
    });
  });

  describe("deleteCoverImage", () => {
    it("should delete existing cover", async () => {
      const { deleteCoverImage } = await import("./storage");
      mockFs.existsSync.mockReturnValue(true);

      deleteCoverImage("book.jpg");

      expect(mockFs.unlinkSync).toHaveBeenCalledWith(
        path.join(COVERS_DIR, "book.jpg")
      );
    });

    it("should not throw if cover does not exist", async () => {
      const { deleteCoverImage } = await import("./storage");
      mockFs.existsSync.mockReturnValue(false);

      expect(() => deleteCoverImage("nonexistent.jpg")).not.toThrow();
      expect(mockFs.unlinkSync).not.toHaveBeenCalled();
    });
  });

  describe("getCoverFilePath", () => {
    it("should return correct cover path", async () => {
      const { getCoverFilePath } = await import("./storage");
      const result = getCoverFilePath("book.jpg");
      expect(result).toBe(path.join(COVERS_DIR, "book.jpg"));
    });
  });

  describe("coverExists", () => {
    it("should return true if cover exists", async () => {
      const { coverExists } = await import("./storage");
      mockFs.existsSync.mockReturnValue(true);

      const result = coverExists("book.jpg");
      expect(result).toBe(true);
    });

    it("should return false if cover does not exist", async () => {
      const { coverExists } = await import("./storage");
      mockFs.existsSync.mockReturnValue(false);

      const result = coverExists("book.jpg");
      expect(result).toBe(false);
    });
  });
});
