import { describe, expect, it, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const mockAuth = vi.fn();
const mockInsertValues = vi.fn();
const mockSelect = vi.fn();
const mockSelectResults: unknown[][] = [];
const mockSaveBookFile = vi.fn();
const mockDeleteBookFile = vi.fn();
const mockDeleteCoverImage = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: vi.fn(() => ({
      values: mockInsertValues,
    })),
    query: {
      books: {
        findFirst: vi.fn(),
      },
    },
  },
}));

vi.mock("@/lib/storage", () => ({
  saveBookFile: (...args: unknown[]) => mockSaveBookFile(...args),
  saveCoverImage: vi.fn(),
  deleteBookFile: (...args: unknown[]) => mockDeleteBookFile(...args),
  deleteCoverImage: (...args: unknown[]) => mockDeleteCoverImage(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

interface MockUploadFile {
  name: string;
  size: number;
  arrayBuffer: ReturnType<typeof vi.fn>;
}

function createUploadRequest(file: MockUploadFile): NextRequest {
  return {
    formData: vi.fn().mockResolvedValue({
      get: (key: string) => (key === "file" ? file : null),
    }),
  } as unknown as NextRequest;
}

function createBooksGetRequest(url: string): NextRequest {
  return {
    url,
  } as unknown as NextRequest;
}

function createQueryResult(result: unknown[]) {
  const query = {
    from: vi.fn(() => query),
    leftJoin: vi.fn(() => query),
    where: vi.fn(() => query),
    orderBy: vi.fn(() => query),
    groupBy: vi.fn(() => query),
    limit: vi.fn(() => query),
    offset: vi.fn(() => query),
    then: (onFulfilled?: (value: unknown[]) => unknown, onRejected?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(onFulfilled, onRejected),
    catch: (onRejected?: (reason: unknown) => unknown) => Promise.resolve(result).catch(onRejected),
    finally: (onFinally?: () => void) => Promise.resolve(result).finally(onFinally),
  };

  return query;
}

describe("Books API upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectResults.length = 0;
    mockSelect.mockImplementation(() => createQueryResult(mockSelectResults.shift() ?? []));
    mockAuth.mockResolvedValue({
      user: { id: "user-1", username: "test", email: "test@test.com" },
      expires: new Date().toISOString(),
    });
    mockSaveBookFile.mockReturnValue("book-1.epub");
  });

  it("accepts EPUB files exported with an .epub.zip extension", async () => {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    zip.file("Rust 程序设计第2版.epub/META-INF/container.xml", `
      <container>
        <rootfiles>
          <rootfile full-path="OPS/content.opf" />
        </rootfiles>
      </container>
    `);
    zip.file("Rust 程序设计第2版.epub/OPS/content.opf", `
      <package>
        <metadata>
          <dc:title>Rust 程序设计第2版</dc:title>
          <dc:creator>Jim Blandy</dc:creator>
        </metadata>
      </package>
    `);
    const buffer = await zip.generateAsync({ type: "nodebuffer" });
    const file = {
      name: "Rust 程序设计第2版.epub.zip",
      size: buffer.length,
      arrayBuffer: vi.fn().mockResolvedValue(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)),
    };

    mockInsertValues.mockResolvedValueOnce(undefined);

    const { POST } = await import("./route");
    const res = await POST(createUploadRequest(file));

    expect(res.status).toBe(201);
    expect(mockSaveBookFile).toHaveBeenCalledWith(expect.any(Buffer), expect.any(String), "epub");
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Rust 程序设计第2版",
        author: "Jim Blandy",
        format: "epub",
      })
    );
  });

  it("rejects EPUB files larger than the upload limit", async () => {
    const file = {
      name: "large.epub",
      size: 301 * 1024 * 1024,
      arrayBuffer: vi.fn(),
    };

    const { POST } = await import("./route");
    const res = await POST(createUploadRequest(file));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("文件不能超过 300 MB");
    expect(file.arrayBuffer).not.toHaveBeenCalled();
    expect(mockSaveBookFile).not.toHaveBeenCalled();
  });

  it("rejects files with an EPUB extension but invalid ZIP content", async () => {
    const invalidBuffer = Buffer.from("not a zip");
    const file = {
      name: "book.epub",
      size: invalidBuffer.length,
      arrayBuffer: vi.fn().mockResolvedValue(
        invalidBuffer.buffer.slice(
          invalidBuffer.byteOffset,
          invalidBuffer.byteOffset + invalidBuffer.byteLength
        )
      ),
    };

    const { POST } = await import("./route");
    const res = await POST(createUploadRequest(file));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("文件内容无效，不是有效的 EPUB 文件");
    expect(mockSaveBookFile).not.toHaveBeenCalled();
  });

  it("cleans up the saved EPUB file when database insert fails", async () => {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    zip.file("META-INF/container.xml", "<container />");
    const buffer = await zip.generateAsync({ type: "nodebuffer" });
    const file = {
      name: "book.epub",
      size: 1024,
      arrayBuffer: vi.fn().mockResolvedValue(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)),
    };
    mockInsertValues.mockRejectedValueOnce(new Error("insert failed"));

    const { POST } = await import("./route");
    const res = await POST(createUploadRequest(file));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("上传失败");
    expect(mockSaveBookFile).toHaveBeenCalled();
    expect(mockDeleteBookFile).toHaveBeenCalledWith("book-1.epub");
  });
});

describe("Books API list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectResults.length = 0;
    mockSelect.mockImplementation(() => createQueryResult(mockSelectResults.shift() ?? []));
    mockAuth.mockResolvedValue({
      user: { id: "user-1", username: "test", email: "test@test.com" },
      expires: new Date().toISOString(),
    });
  });

  it("skips facet queries when includeFacets is false", async () => {
    mockSelectResults.push(
      [
        {
          book: { id: "book-1", title: "Book", author: "Author" },
          progress: null,
          lastReadAt: null,
        },
      ],
      [{ count: 1 }]
    );

    const { GET } = await import("./route");
    const res = await GET(
      createBooksGetRequest("http://localhost:3000/api/books?page=2&includeFacets=false")
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(mockSelect).toHaveBeenCalledTimes(2);
    expect(data.books).toHaveLength(1);
    expect(data.categories).toEqual([]);
    expect(data.total).toBe(1);
    expect(data.allTotal).toBe(1);
  });

  it("includes facet queries by default", async () => {
    mockSelectResults.push(
      [],
      [{ count: 0 }],
      [{ count: 2 }],
      [{ name: "小说", count: 2 }]
    );

    const { GET } = await import("./route");
    const res = await GET(createBooksGetRequest("http://localhost:3000/api/books"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(mockSelect).toHaveBeenCalledTimes(4);
    expect(data.categories).toEqual([{ name: "小说", count: 2 }]);
    expect(data.total).toBe(0);
    expect(data.allTotal).toBe(2);
  });

  it("rejects overlong search keywords before querying", async () => {
    const { GET } = await import("./route");
    const res = await GET(
      createBooksGetRequest(`http://localhost:3000/api/books?search=${"a".repeat(101)}`)
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("搜索关键词不能超过 100 个字符");
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it("rejects overlong category filters before querying", async () => {
    const { GET } = await import("./route");
    const res = await GET(
      createBooksGetRequest(`http://localhost:3000/api/books?category=${"a".repeat(41)}`)
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("分类名称不能超过 40 个字符");
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it("trims search and category filters", async () => {
    mockSelectResults.push([], [{ count: 0 }]);

    const { GET } = await import("./route");
    const res = await GET(
      createBooksGetRequest(
        "http://localhost:3000/api/books?search=%20Book%20&category=%20Tech%20&includeFacets=false"
      )
    );

    expect(res.status).toBe(200);
    expect(mockSelect).toHaveBeenCalledTimes(2);
  });
});

describe("EPUB ZIP safety validation", () => {
  it("rejects unsafe entry paths", async () => {
    const { validateEpubZipEntries, EpubValidationError } = await import("./route");

    expect(() =>
      validateEpubZipEntries({
        files: {
          "../evil.txt": {
            dir: false,
            name: "evil.txt",
            unsafeOriginalName: "../evil.txt",
          },
        },
      })
    ).toThrow(EpubValidationError);
  });

  it("rejects archives with too many file entries", async () => {
    const { validateEpubZipEntries, EpubValidationError } = await import("./route");
    const files: Record<string, { dir: boolean; name: string }> = {};

    for (let i = 0; i < 10001; i++) {
      files[`text/${i}.xhtml`] = {
        dir: false,
        name: `text/${i}.xhtml`,
      };
    }

    expect(() => validateEpubZipEntries({ files })).toThrow(EpubValidationError);
  });

  it("rejects archives with excessive known uncompressed size", async () => {
    const { validateEpubZipEntries, EpubValidationError } = await import("./route");

    expect(() =>
      validateEpubZipEntries({
        files: {
          "text/chapter.xhtml": {
            dir: false,
            name: "text/chapter.xhtml",
            _data: {
              uncompressedSize: 901 * 1024 * 1024,
            },
          },
        },
      })
    ).toThrow(EpubValidationError);
  });
});

describe("normalizeBooksPagination", () => {
  it("falls back to defaults for invalid values", async () => {
    const { normalizeBooksPagination } = await import("./route");

    expect(normalizeBooksPagination("-3", "abc")).toEqual({
      page: 1,
      limit: 20,
      offset: 0,
    });
  });

  it("caps the limit to the maximum page size", async () => {
    const { normalizeBooksPagination } = await import("./route");

    expect(normalizeBooksPagination("2", "999")).toEqual({
      page: 2,
      limit: 100,
      offset: 100,
    });
  });

  it("calculates offset for valid page and limit", async () => {
    const { normalizeBooksPagination } = await import("./route");

    expect(normalizeBooksPagination("3", "25")).toEqual({
      page: 3,
      limit: 25,
      offset: 50,
    });
  });
});

describe("resolveEpubRelativePath", () => {
  it("resolves relative paths from the OPF directory", async () => {
    const { resolveEpubRelativePath } = await import("./route");

    expect(resolveEpubRelativePath("OPS/package.opf", "images/cover.jpg")).toBe(
      "OPS/images/cover.jpg"
    );
  });

  it("allows parent traversal that stays within the EPUB root", async () => {
    const { resolveEpubRelativePath } = await import("./route");

    expect(resolveEpubRelativePath("OPS/content/package.opf", "../images/cover.jpg")).toBe(
      "OPS/images/cover.jpg"
    );
  });

  it("rejects paths that escape the EPUB root", async () => {
    const { resolveEpubRelativePath } = await import("./route");

    expect(resolveEpubRelativePath("OPS/package.opf", "../../cover.jpg")).toBeNull();
  });

  it("rejects absolute and URL-like paths", async () => {
    const { resolveEpubRelativePath } = await import("./route");

    expect(resolveEpubRelativePath("OPS/package.opf", "/cover.jpg")).toBeNull();
    expect(resolveEpubRelativePath("OPS/package.opf", "https://example.com/cover.jpg")).toBeNull();
  });
});

describe("EPUB XML metadata parsing", () => {
  it("parses rootfile full-path with single-quoted attributes", async () => {
    const { parseEpubContainerRootfilePath } = await import("./route");

    expect(
      parseEpubContainerRootfilePath(
        `<container><rootfiles><rootfile media-type='application/oebps-package+xml' full-path='OPS/content.opf'/></rootfiles></container>`
      )
    ).toBe("OPS/content.opf");
  });

  it("parses OPF metadata regardless of item attribute order", async () => {
    const { parseEpubOpfMetadata } = await import("./route");
    const metadata = parseEpubOpfMetadata(`
      <package>
        <metadata>
          <dc:title>Title &amp; More</dc:title>
          <dc:creator>Author &apos;Name&apos;</dc:creator>
          <meta content="cover-id" name="cover" />
        </metadata>
        <manifest>
          <item media-type="image/jpeg" href="images/cover.jpg" id="cover-id" />
        </manifest>
      </package>
    `);

    expect(metadata).toEqual({
      title: "Title & More",
      author: "Author 'Name'",
      coverItemHref: "images/cover.jpg",
    });
  });

  it("falls back to cover-image properties when cover meta is absent", async () => {
    const { parseEpubOpfMetadata } = await import("./route");
    const metadata = parseEpubOpfMetadata(`
      <package>
        <manifest>
          <item id="cover-image" properties="nav cover-image" href="cover.png" />
        </manifest>
      </package>
    `);

    expect(metadata.coverItemHref).toBe("cover.png");
  });
});
