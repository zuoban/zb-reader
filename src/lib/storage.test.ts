import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import path from "path";
import { EventEmitter } from "events";
const mockFs = {
  existsSync: vi.fn(),
  createWriteStream: vi.fn(),
};

const mockFsAsync = {
  access: vi.fn(),
  mkdir: vi.fn(),
  writeFile: vi.fn(),
  unlink: vi.fn(),
};

vi.mock("fs", () => ({
  default: mockFs,
  existsSync: mockFs.existsSync,
  createWriteStream: mockFs.createWriteStream,
}));

vi.mock("fs/promises", () => ({
  access: mockFsAsync.access,
  mkdir: mockFsAsync.mkdir,
  writeFile: mockFsAsync.writeFile,
  unlink: mockFsAsync.unlink,
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
    mockFs.createWriteStream.mockImplementation(() => {
      const stream = new EventEmitter() as EventEmitter & {
        write: ReturnType<typeof vi.fn>;
        end: ReturnType<typeof vi.fn>;
      };
      stream.write = vi.fn(() => true);
      stream.end = vi.fn(() => {
        queueMicrotask(() => stream.emit("finish"));
      });
      return stream;
    });
    mockFsAsync.access.mockResolvedValue(undefined);
    mockFsAsync.mkdir.mockResolvedValue(undefined);
    mockFsAsync.writeFile.mockResolvedValue(undefined);
    mockFsAsync.unlink.mockResolvedValue(undefined);
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

      const result = await saveBookFile(buffer, bookId, format);

      expect(result).toBe(`${bookId}.${format}`);
      expect(mockFsAsync.writeFile).toHaveBeenCalledWith(
        path.join(BOOKS_DIR, `${bookId}.${format}`),
        buffer
      );
    });

    it("should handle different formats", async () => {
      const { saveBookFile } = await import("./storage");
      const formats = ["epub"];

      for (const format of formats) {
        const buffer = Buffer.from("test");
        const result = await saveBookFile(buffer, `book-${format}`, format);
        expect(result).toBe(`book-${format}.${format}`);
      }
    });
  });

  describe("saveBookToTemp", () => {
    it("waits for the write stream to finish before resolving web streams", async () => {
      const stream = new EventEmitter() as EventEmitter & {
        write: ReturnType<typeof vi.fn>;
        end: ReturnType<typeof vi.fn>;
      };
      stream.write = vi.fn(() => true);
      stream.end = vi.fn();
      mockFs.createWriteStream.mockReturnValue(stream);

      const { saveBookToTemp } = await import("./storage");
      const input = new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2, 3]));
          controller.close();
        },
      });

      let resolved = false;
      const promise = saveBookToTemp(input, "book-id", "epub").then(() => {
        resolved = true;
      });

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(stream.end).toHaveBeenCalled();
      expect(resolved).toBe(false);

      stream.emit("finish");
      await promise;

      expect(resolved).toBe(true);
    });
  });

  describe("deleteBookFile", () => {
    it("should delete existing file", async () => {
      const { deleteBookFile } = await import("./storage");
      mockFs.existsSync.mockReturnValue(true);

      await deleteBookFile("test-book.epub");

      expect(mockFsAsync.unlink).toHaveBeenCalledWith(
        path.join(BOOKS_DIR, "test-book.epub")
      );
    });

    it("should not throw if file does not exist", async () => {
      const { deleteBookFile } = await import("./storage");
      mockFs.existsSync.mockReturnValue(false);

      await expect(deleteBookFile("nonexistent.epub")).resolves.toBeUndefined();
      expect(mockFsAsync.unlink).not.toHaveBeenCalled();
    });

    it("should reject unsafe book file names", async () => {
      const { deleteBookFile, StoragePathError } = await import("./storage");

      await expect(deleteBookFile("../db.sqlite")).rejects.toThrow(StoragePathError);
      expect(mockFsAsync.unlink).not.toHaveBeenCalled();
    });
  });

  describe("getBookFilePath", () => {
    it("should return correct path", async () => {
      const { getBookFilePath } = await import("./storage");
      const result = getBookFilePath("book.epub");
      expect(result).toBe(path.join(BOOKS_DIR, "book.epub"));
    });

    it("should reject absolute paths", async () => {
      const { getBookFilePath, StoragePathError } = await import("./storage");

      expect(() => getBookFilePath("/tmp/book.epub")).toThrow(StoragePathError);
    });
  });

  describe("bookFileExists", () => {
    it("should return true if file exists", async () => {
      const { bookFileExists } = await import("./storage");
      mockFsAsync.access.mockResolvedValue(undefined);

      const result = await bookFileExists("book.epub");
      expect(result).toBe(true);
      expect(mockFsAsync.access).toHaveBeenCalledWith(
        path.join(BOOKS_DIR, "book.epub")
      );
    });

    it("should return false if file does not exist", async () => {
      const { bookFileExists } = await import("./storage");
      mockFsAsync.access.mockRejectedValue(new Error("missing"));

      const result = await bookFileExists("book.epub");
      expect(result).toBe(false);
    });

    it("should reject nested paths", async () => {
      const { bookFileExists, StoragePathError } = await import("./storage");

      await expect(bookFileExists("nested/book.epub")).rejects.toThrow(StoragePathError);
    });
  });

  describe("saveCoverImage", () => {
    it("should save cover image with jpg extension", async () => {
      const { saveCoverImage } = await import("./storage");
      const buffer = Buffer.from("image data");
      const bookId = "test-book";

      const result = await saveCoverImage(buffer, bookId);

      expect(result).toBe(`${bookId}.jpg`);
      expect(mockFsAsync.writeFile).toHaveBeenCalledWith(
        path.join(COVERS_DIR, `${bookId}.jpg`),
        buffer
      );
    });
  });

  describe("deleteCoverImage", () => {
    it("should delete existing cover", async () => {
      const { deleteCoverImage } = await import("./storage");
      mockFs.existsSync.mockReturnValue(true);

      await deleteCoverImage("book.jpg");

      expect(mockFsAsync.unlink).toHaveBeenCalledWith(
        path.join(COVERS_DIR, "book.jpg")
      );
    });

    it("should not throw if cover does not exist", async () => {
      const { deleteCoverImage } = await import("./storage");
      mockFs.existsSync.mockReturnValue(false);

      await expect(deleteCoverImage("nonexistent.jpg")).resolves.toBeUndefined();
      expect(mockFsAsync.unlink).not.toHaveBeenCalled();
    });

    it("should reject unsafe cover file names", async () => {
      const { deleteCoverImage, StoragePathError } = await import("./storage");

      await expect(deleteCoverImage("..\\secret.jpg")).rejects.toThrow(StoragePathError);
      expect(mockFsAsync.unlink).not.toHaveBeenCalled();
    });
  });

  describe("getCoverFilePath", () => {
    it("should return correct cover path", async () => {
      const { getCoverFilePath } = await import("./storage");
      const result = getCoverFilePath("book.jpg");
      expect(result).toBe(path.join(COVERS_DIR, "book.jpg"));
    });

    it("should reject unsupported characters", async () => {
      const { getCoverFilePath, StoragePathError } = await import("./storage");

      expect(() => getCoverFilePath("book name.jpg")).toThrow(StoragePathError);
    });
  });

  describe("coverExists", () => {
    it("should return true if cover exists", async () => {
      const { coverExists } = await import("./storage");
      mockFsAsync.access.mockResolvedValue(undefined);

      const result = await coverExists("book.jpg");
      expect(result).toBe(true);
    });

    it("should return false if cover does not exist", async () => {
      const { coverExists } = await import("./storage");
      mockFsAsync.access.mockRejectedValue(new Error("missing"));

      const result = await coverExists("book.jpg");
      expect(result).toBe(false);
    });
  });
});
