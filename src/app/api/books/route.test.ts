import { describe, expect, it, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const mockAuth = vi.fn();
const mockInsertValues = vi.fn();
const mockSelect = vi.fn();
const mockSelectResults: unknown[][] = [];
const mockSaveBookFile = vi.fn();
const mockSaveBookToTemp = vi.fn();
const mockMoveBookFromTemp = vi.fn();
const mockDeleteBookFile = vi.fn();
const mockDeleteCoverImage = vi.fn();
const mockGetBookFilePath = vi.fn();
const mockStatSync = vi.fn();
const mockProcessBookUpload = vi.fn();
const mockGetBookFacets = vi.fn();
const mockInvalidateBookFacets = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/lib/book-facets-cache", () => ({
  getBookFacets: (...args: unknown[]) => mockGetBookFacets(...args),
  invalidateBookFacets: (...args: unknown[]) => mockInvalidateBookFacets(...args),
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: vi.fn(() => ({
      values: (...args: unknown[]) => mockInsertValues(...args),
    })),
    query: {
      books: {
        findFirst: vi.fn().mockResolvedValue({ id: "book-1", title: "Test Book" }),
      },
    },
  },
}));

vi.mock("@/lib/storage", () => ({
  saveBookFile: (...args: unknown[]) => mockSaveBookFile(...args),
  saveBookToTemp: (...args: unknown[]) => mockSaveBookToTemp(...args),
  moveBookFromTemp: (...args: unknown[]) => mockMoveBookFromTemp(...args),
  saveCoverImage: vi.fn(),
  deleteBookFile: (...args: unknown[]) => mockDeleteBookFile(...args),
  deleteCoverImage: (...args: unknown[]) => mockDeleteCoverImage(...args),
  getBookFilePath: (...args: unknown[]) => mockGetBookFilePath(...args),
}));

vi.mock("@/lib/upload-pipeline", async () => {
  const actual = await vi.importActual("@/lib/upload-pipeline");
  return {
    ...actual,
    processBookUpload: (...args: unknown[]) => mockProcessBookUpload(...args),
  };
});

vi.mock("fs", () => ({
  default: {
    statSync: (...args: unknown[]) => mockStatSync(...args),
  },
  statSync: (...args: unknown[]) => mockStatSync(...args),
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
  stream: ReturnType<typeof vi.fn>;
}

function createUploadRequest(file: MockUploadFile): NextRequest {
  const formData = new FormData();
  // In Node.js, we can append a Blob and specify a filename.
  // We mock the stream on the resulting File object if possible, 
  // but since we mock processBookUpload anyway, the content doesn't matter much
  // as long as the route handler can get the name and size.
  const blob = new Blob([""], { type: "application/epub+zip" });
  formData.append("file", blob, file.name);
  
  // Since we can't easily mock the size of a Blob/File in standard FormData,
  // we might need to override the get method or just use a dummy blob of the right size
  // if size check is important (which it is for one test).
  if (file.size > 0) {
    const originalGet = formData.get.bind(formData);
    formData.get = (name: string) => {
        const item = originalGet(name);
        if (name === 'file' && item) {
            Object.defineProperty(item, 'size', { value: file.size });
            Object.defineProperty(item, 'stream', { value: file.stream });
            return item;
        }
        return item;
    };
  }

  return {
    formData: async () => formData,
  } as unknown as NextRequest;
}

function createBooksGetRequest(url: string): NextRequest {
  return {
    url,
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

function createQueryResult(results: unknown[]) {
  const query = {
    from: vi.fn(() => query),
    leftJoin: vi.fn(() => query),
    where: vi.fn(() => query),
    orderBy: vi.fn(() => query),
    limit: vi.fn(() => query),
    offset: vi.fn(() => query),
    then: (resolve: (val: unknown) => void) => resolve(results),
    catch: (_reject: (err: unknown) => void) => {},
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
    mockGetBookFilePath.mockReturnValue("/tmp/book-1.epub");
    mockStatSync.mockReturnValue({ size: 1024 });
    mockGetBookFacets.mockResolvedValue({ allTotal: 0, categories: [] });
    mockInvalidateBookFacets.mockReturnValue(undefined);
    mockProcessBookUpload.mockResolvedValue({
      metadata: { title: "Test Book", author: "Test Author", needsNormalization: false },
      savedFileName: "book-1.epub",
    });
  });

  it("accepts EPUB files and uses the hardened pipeline", async () => {
    const file = {
      name: "test.epub",
      size: 1024,
      stream: vi.fn().mockReturnValue("stream"),
    };

    mockInsertValues.mockResolvedValueOnce(undefined);

    const { POST } = await import("./route");
    const res = await POST(createUploadRequest(file));

    expect(res.status).toBe(201);
    expect(mockProcessBookUpload).toHaveBeenCalled();
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Test Book",
        author: "Test Author",
        format: "epub",
      })
    );
  });

  it("rejects EPUB files larger than the upload limit", async () => {
    const file = {
      name: "large.epub",
      size: 301 * 1024 * 1024,
      stream: vi.fn(),
    };

    const { POST } = await import("./route");
    const res = await POST(createUploadRequest(file));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("文件不能超过 300 MB");
    expect(mockProcessBookUpload).not.toHaveBeenCalled();
  });

  it("cleans up the saved EPUB file when database insert fails", async () => {
    const file = {
      name: "book.epub",
      size: 1024,
      stream: vi.fn(),
    };
    mockInsertValues.mockRejectedValueOnce(new Error("insert failed"));

    const { POST } = await import("./route");
    const res = await POST(createUploadRequest(file));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("上传失败");
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
      [{ count: 0 }]
    );
    mockGetBookFacets.mockResolvedValue({ allTotal: 2, categories: [{ name: "小说", count: 2 }] });

    const { GET } = await import("./route");
    const res = await GET(createBooksGetRequest("http://localhost:3000/api/books"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(mockSelect).toHaveBeenCalledTimes(2);
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

  it("accepts the uncategorized category token", async () => {
    mockSelectResults.push([], [{ count: 0 }]);

    const { GET } = await import("./route");
    const res = await GET(
      createBooksGetRequest("http://localhost:3000/api/books?category=__uncategorized__&includeFacets=false")
    );

    expect(res.status).toBe(200);
    expect(mockSelect).toHaveBeenCalledTimes(2);
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
