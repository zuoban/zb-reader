import { NextRequest, NextResponse } from "next/server";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { db } from "@/lib/db";
import { books, readingProgress } from "@/lib/db/schema";
import { 
  deleteBookFile, 
  deleteCoverImage, 
  saveBookFile, 
  saveBookFileFromStream,
  saveCoverImage,
  getBookFilePath 
} from "@/lib/storage";
import { logger } from "@/lib/logger";
import { badRequest, serverError, getAuthUserId } from "@/lib/api-utils";
import { formatBytes } from "@/lib/utils";
import { MAX_EPUB_FILE_SIZE_BYTES } from "@/lib/upload-limits";
import yauzl from "yauzl";
import fs from "fs";
import { Readable } from "stream";

const DEFAULT_BOOKS_PAGE = 1;
const DEFAULT_BOOKS_LIMIT = 20;
const MAX_BOOKS_LIMIT = 100;
const MAX_BOOKS_SEARCH_LENGTH = 100;
const MAX_BOOKS_CATEGORY_LENGTH = 40;
const MAX_EPUB_ENTRY_COUNT = 10000;
const MAX_EPUB_UNCOMPRESSED_SIZE_BYTES = MAX_EPUB_FILE_SIZE_BYTES * 3;
// EPUB files are ZIP files, magic bytes: PK\x03\x04
const EPUB_MAGIC_BYTES = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);

interface UploadedEpubInfo {
  storageFormat: "epub";
  titleBase: string;
}

interface ZipEntryLike {
  dir: boolean;
  name: string;
  unsafeOriginalName?: string;
  _data?: {
    uncompressedSize?: number;
  };
}

export class EpubValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EpubValidationError";
  }
}

export function normalizeBooksPagination(pageParam: string | null, limitParam: string | null) {
  const parsedPage = Number.parseInt(pageParam || "", 10);
  const parsedLimit = Number.parseInt(limitParam || "", 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : DEFAULT_BOOKS_PAGE;
  const limit =
    Number.isFinite(parsedLimit) && parsedLimit > 0
      ? Math.min(parsedLimit, MAX_BOOKS_LIMIT)
      : DEFAULT_BOOKS_LIMIT;

  return {
    page,
    limit,
    offset: (page - 1) * limit,
  };
}

export function resolveEpubRelativePath(basePath: string, href: string): string | null {
  const normalizedHref = href.replace(/\\/g, "/").trim();
  if (!normalizedHref || normalizedHref.startsWith("/") || /^[a-z][a-z0-9+.-]*:/i.test(normalizedHref)) {
    return null;
  }

  const baseParts = basePath.split("/").filter(Boolean);
  baseParts.pop();
  const hrefParts = normalizedHref.split("/").filter(Boolean);
  const resultParts = [...baseParts];

  for (const part of hrefParts) {
    if (part === ".") continue;
    if (part === "..") {
      if (resultParts.length === 0) return null;
      resultParts.pop();
      continue;
    }
    resultParts.push(part);
  }

  return resultParts.length > 0 ? resultParts.join("/") : null;
}

function validateZipEntryPath(pathName: string): boolean {
  const normalizedPath = pathName.replace(/\\/g, "/").trim();
  if (
    !normalizedPath ||
    normalizedPath.includes("\0") ||
    normalizedPath.startsWith("/") ||
    /^[a-z][a-z0-9+.-]*:/i.test(normalizedPath)
  ) {
    return false;
  }

  return resolveEpubRelativePath("", normalizedPath) !== null;
}

export function validateEpubZipEntries(zip: { files: Record<string, ZipEntryLike> }) {
  const entries = Object.values(zip.files);
  const fileEntries = entries.filter((entry) => !entry.dir);

  if (fileEntries.length > MAX_EPUB_ENTRY_COUNT) {
    throw new EpubValidationError("EPUB 内文件数量过多");
  }

  let knownUncompressedSize = 0;
  for (const entry of entries) {
    if (!validateZipEntryPath(entry.unsafeOriginalName ?? entry.name)) {
      throw new EpubValidationError("EPUB 包含不安全的文件路径");
    }

    const uncompressedSize = entry._data?.uncompressedSize;
    if (typeof uncompressedSize === "number" && Number.isFinite(uncompressedSize)) {
      knownUncompressedSize += uncompressedSize;
      if (knownUncompressedSize > MAX_EPUB_UNCOMPRESSED_SIZE_BYTES) {
        throw new EpubValidationError("EPUB 解压后体积过大");
      }
    }
  }
}

function hasEpubMagicBytes(buffer: Buffer): boolean {
  return (
    buffer.length >= 4 &&
    buffer[0] === EPUB_MAGIC_BYTES[0] &&
    buffer[1] === EPUB_MAGIC_BYTES[1] &&
    buffer[2] === EPUB_MAGIC_BYTES[2] &&
    buffer[3] === EPUB_MAGIC_BYTES[3]
  );
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'");
}

function parseXmlAttributes(rawAttributes: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrRegex = /([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let match: RegExpExecArray | null;

  while ((match = attrRegex.exec(rawAttributes)) !== null) {
    attrs[match[1]] = decodeXmlEntities(match[2] ?? match[3] ?? "");
  }

  return attrs;
}

function getXmlElementText(xml: string, tagName: string): string | undefined {
  const escapedTagName = tagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`<${escapedTagName}\\b[^>]*>([\\s\\S]*?)<\\/${escapedTagName}>`, "i");
  const match = xml.match(regex);
  const text = match?.[1]?.replace(/<[^>]+>/g, "").trim();
  return text ? decodeXmlEntities(text) : undefined;
}

export function parseEpubContainerRootfilePath(containerXml: string): string | undefined {
  const rootfileRegex = /<rootfile\b([^>]*)\/?>/gi;
  let match: RegExpExecArray | null;

  while ((match = rootfileRegex.exec(containerXml)) !== null) {
    const attrs = parseXmlAttributes(match[1]);
    if (attrs["full-path"]) {
      return attrs["full-path"];
    }
  }

  return undefined;
}

export function parseEpubOpfMetadata(opfContent: string): {
  title?: string;
  author?: string;
  coverItemHref?: string;
} {
  const title = getXmlElementText(opfContent, "dc:title");
  const author = getXmlElementText(opfContent, "dc:creator");
  let coverId: string | undefined;
  let coverItemHref: string | undefined;

  const metaRegex = /<meta\b([^>]*)\/?>/gi;
  let metaMatch: RegExpExecArray | null;
  while ((metaMatch = metaRegex.exec(opfContent)) !== null) {
    const attrs = parseXmlAttributes(metaMatch[1]);
    if (attrs.name?.toLowerCase() === "cover" && attrs.content) {
      coverId = attrs.content;
      break;
    }
  }

  const itemRegex = /<item\b([^>]*)\/?>/gi;
  let itemMatch: RegExpExecArray | null;
  while ((itemMatch = itemRegex.exec(opfContent)) !== null) {
    const attrs = parseXmlAttributes(itemMatch[1]);
    if (coverId && attrs.id === coverId && attrs.href) {
      coverItemHref = attrs.href;
      break;
    }
    if (!coverItemHref && attrs.properties?.split(/\s+/).includes("cover-image") && attrs.href) {
      coverItemHref = attrs.href;
    }
  }

  return { title, author, coverItemHref };
}

function getUploadedEpubInfo(fileName: string): UploadedEpubInfo | null {
  const normalizedFileName = fileName.trim();
  const lowerFileName = normalizedFileName.toLowerCase();

  if (lowerFileName.endsWith(".epub")) {
    return {
      storageFormat: "epub",
      titleBase: normalizedFileName.slice(0, -".epub".length),
    };
  }

  if (lowerFileName.endsWith(".epub.zip")) {
    return {
      storageFormat: "epub",
      titleBase: normalizedFileName.slice(0, -".epub.zip".length),
    };
  }

  return null;
}

async function normalizeEpubBuffer(buffer: Buffer): Promise<Buffer> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(buffer);
  validateEpubZipEntries(zip);

  if (zip.file("META-INF/container.xml")) {
    return buffer;
  }

  const nestedContainerPath = Object.keys(zip.files).find((entryPath) =>
    /(^|\/)META-INF\/container\.xml$/i.test(entryPath)
  );
  if (!nestedContainerPath) return buffer;

  const prefix = nestedContainerPath.slice(0, -("META-INF/container.xml".length));
  if (!prefix) return buffer;

  const normalizedZip = new JSZip();
  const entries = Object.values(zip.files).filter(
    (entry) => !entry.dir && entry.name.startsWith(prefix)
  );

  await Promise.all(
    entries.map(async (entry) => {
      const normalizedPath = entry.name.slice(prefix.length);
      if (!normalizedPath) return;
      normalizedZip.file(normalizedPath, await entry.async("nodebuffer"));
    })
  );

  const normalizedBuffer = await normalizedZip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
  const normalizedLoadedZip = await JSZip.loadAsync(normalizedBuffer);
  validateEpubZipEntries(normalizedLoadedZip);

  return normalizedBuffer;
}

export async function GET(req: NextRequest) {
  const authResult = await getAuthUserId();
  if (authResult.error) return authResult.error;
  const { userId } = authResult;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() || "";
  const { page, limit, offset } = normalizeBooksPagination(
    searchParams.get("page"),
    searchParams.get("limit")
  );
  const withProgress = searchParams.get("withProgress") === "true";
  const includeFacets = searchParams.get("includeFacets") !== "false";
  const category = searchParams.get("category")?.trim() || "";

  if (search.length > MAX_BOOKS_SEARCH_LENGTH) {
    return badRequest("搜索关键词不能超过 100 个字符");
  }

  if (category.length > MAX_BOOKS_CATEGORY_LENGTH) {
    return badRequest("分类名称不能超过 40 个字符");
  }

  try {
    let whereClause = eq(books.uploaderId, userId);

    if (search) {
      // Escape double quotes to prevent FTS match syntax errors
      const escapedSearch = search.replace(/"/g, '""');
      whereClause = and(
        whereClause,
        sql`books.rowid IN (SELECT rowid FROM books_fts WHERE books_fts MATCH ${`"${escapedSearch}"`})`
      )!;
    }

    if (category) {
      whereClause = and(whereClause, eq(books.category, category))!;
    }

    const [result, totalResult, allTotalResult, categoryRows] = await Promise.all([
      db
        .select({
          book: books,
          progress: readingProgress.furthestProgress,
          lastReadAt: readingProgress.lastReadAt,
        })
        .from(books)
        .leftJoin(
          readingProgress,
          and(
            eq(readingProgress.bookId, books.id),
            eq(readingProgress.userId, userId)
          )
        )
        .where(whereClause)
        .orderBy(desc(books.updatedAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(books).where(whereClause),
      includeFacets
        ? db.select({ count: count() }).from(books).where(eq(books.uploaderId, userId))
        : Promise.resolve([]),
      includeFacets
        ? db
          .select({
            name: books.category,
            count: count(),
          })
          .from(books)
          .where(
            and(
              eq(books.uploaderId, userId),
              sql`coalesce(${books.category}, '') <> ''`
            )
          )
          .groupBy(books.category)
          .orderBy(books.category)
        : Promise.resolve([]),
    ]);
    const total = totalResult[0]?.count ?? 0;
    const allTotal = includeFacets ? allTotalResult[0]?.count ?? total : total;
    const categories = categoryRows.map((row) => ({
      name: row.name ?? "",
      count: row.count,
    }));

    if (!withProgress || result.length === 0) {
      return NextResponse.json({
        books: result.map((r) => r.book),
        categories,
        total,
        allTotal,
        page,
        limit,
      });
    }

    // 构建进度映射
    const progressMap: Record<string, number> = {};
    const lastReadAtMap: Record<string, string> = {};
    result.forEach((r) => {
      if (r.progress !== null && r.progress !== undefined) {
        progressMap[r.book.id] = r.progress;
        lastReadAtMap[r.book.id] = r.lastReadAt ?? "";
      }
    });

    return NextResponse.json({
      books: result.map((r) => r.book),
      categories,
      progressMap,
      lastReadAtMap,
      total,
      allTotal,
      page,
      limit,
    });
  } catch (error) {
    logger.error("books", "Failed to get books", error);
    return serverError("获取书籍失败");
  }
}

export async function POST(req: NextRequest) {
  const authResult = await getAuthUserId();
  if (authResult.error) return authResult.error;
  const { userId } = authResult;

  let savedFileName: string | null = null;
  let coverFileName: string | null = null;
  const bookId = uuidv4();

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return badRequest("请选择文件");
    }

    const fileName = file.name;
    const epubInfo = getUploadedEpubInfo(fileName);

    if (!epubInfo) {
      return badRequest("不支持的文件格式，仅支持 EPUB");
    }

    if (file.size > MAX_EPUB_FILE_SIZE_BYTES) {
      return badRequest(`文件不能超过 ${formatBytes(MAX_EPUB_FILE_SIZE_BYTES)}`);
    }

    // Save the file first to disk using stream
    savedFileName = await saveBookFileFromStream(file.stream(), bookId, epubInfo.storageFormat);
    const filePath = getBookFilePath(savedFileName);

    // Verify magic bytes (just first 4 bytes)
    const fd = fs.openSync(filePath, "r");
    const magicBuffer = Buffer.alloc(4);
    fs.readSync(fd, magicBuffer, 0, 4, 0);
    fs.closeSync(fd);

    if (!hasEpubMagicBytes(magicBuffer)) {
      await deleteBookFile(savedFileName);
      return badRequest("文件内容无效，不是有效的 EPUB 文件");
    }

    // Validate and extract metadata using yauzl (streaming/file-based)
    let metadata: any;
    try {
      metadata = await validateAndExtractMetadataFromFile(filePath, bookId);
    } catch (error) {
      await deleteBookFile(savedFileName);
      if (error instanceof EpubValidationError) {
        return badRequest(error.message);
      }
      throw error;
    }

    // Handle normalization if needed (fallback to jszip/memory for now as it's rare)
    if (metadata.needsNormalization) {
      const buffer = fs.readFileSync(filePath);
      const normalizedBuffer = await normalizeEpubBuffer(buffer);
      await deleteBookFile(savedFileName);
      savedFileName = await saveBookFile(normalizedBuffer, bookId, epubInfo.storageFormat);
      // Re-extract metadata from normalized buffer
      const normalizedMeta = await extractEpubMetadata(normalizedBuffer, bookId);
      metadata = { ...normalizedMeta, needsNormalization: false };
    }

    let title = metadata.title || epubInfo.titleBase;
    let author = metadata.author || "未知作者";
    coverFileName = metadata.coverFileName || null;

    const manualTitle = formData.get("title") as string | null;
    const manualAuthor = formData.get("author") as string | null;
    if (manualTitle) title = manualTitle;
    if (manualAuthor) author = manualAuthor;

    await db.insert(books).values({
      id: bookId,
      title,
      author,
      cover: coverFileName,
      filePath: savedFileName,
      fileSize: fs.statSync(getBookFilePath(savedFileName)).size,
      format: epubInfo.storageFormat,
      uploaderId: userId,
    });

    const book = await db.query.books.findFirst({
      where: eq(books.id, bookId),
    });

    return NextResponse.json({ book }, { status: 201 });
  } catch (error) {
    if (savedFileName) {
      try {
        await deleteBookFile(savedFileName);
      } catch (cleanupError) {
        logger.warn("books", "Failed to cleanup uploaded book file", cleanupError);
      }
    }
    if (coverFileName) {
      try {
        await deleteCoverImage(coverFileName);
      } catch (cleanupError) {
        logger.warn("books", "Failed to cleanup uploaded cover file", cleanupError);
      }
    }
    logger.error("books", "Failed to upload book", error);
    return serverError("上传失败");
  }
}

async function readZipEntry(zipfile: yauzl.ZipFile, entry: yauzl.Entry): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    zipfile.openReadStream(entry, (err, readStream) => {
      if (err) return reject(err);
      if (!readStream) return reject(new Error("Failed to open read stream"));
      const chunks: Buffer[] = [];
      readStream.on("data", (chunk) => chunks.push(chunk));
      readStream.on("end", () => resolve(Buffer.concat(chunks)));
      readStream.on("error", reject);
    });
  });
}

async function validateAndExtractMetadataFromFile(
  filePath: string,
  bookId: string
): Promise<{
  title?: string;
  author?: string;
  coverFileName?: string;
  needsNormalization: boolean;
}> {
  return new Promise((resolve, reject) => {
    yauzl.open(filePath, { lazyEntries: true }, async (err, zipfile) => {
      if (err) return reject(err);
      if (!zipfile) return reject(new Error("Failed to open zip file"));

      let entryCount = 0;
      let totalUncompressedSize = 0;
      let hasContainerXml = false;
      let containerXmlContent = "";
      let opfPath = "";
      let opfContent = "";
      let coverItemHref = "";
      let metadata: any = {};
      let needsNormalization = false;

      zipfile.readEntry();
      zipfile.on("entry", async (entry: yauzl.Entry) => {
        entryCount++;
        if (entryCount > MAX_EPUB_ENTRY_COUNT) {
          zipfile.close();
          return reject(new EpubValidationError("EPUB 内文件数量过多"));
        }

        totalUncompressedSize += entry.uncompressedSize;
        if (totalUncompressedSize > MAX_EPUB_UNCOMPRESSED_SIZE_BYTES) {
          zipfile.close();
          return reject(new EpubValidationError("EPUB 解压后体积过大"));
        }

        if (!validateZipEntryPath(entry.fileName)) {
          zipfile.close();
          return reject(new EpubValidationError("EPUB 包含不安全的文件路径"));
        }

        if (entry.fileName === "META-INF/container.xml") {
          hasContainerXml = true;
          const buffer = await readZipEntry(zipfile, entry);
          containerXmlContent = buffer.toString();
        } else if (/(^|\/)META-INF\/container\.xml$/i.test(entry.fileName)) {
          needsNormalization = true;
        }

        zipfile.readEntry();
      });

      zipfile.on("end", async () => {
        if (!hasContainerXml) {
          zipfile.close();
          return resolve({ needsNormalization: true });
        }

        const rootFilePath = parseEpubContainerRootfilePath(containerXmlContent);
        if (!rootFilePath) {
          zipfile.close();
          return resolve({ needsNormalization: false });
        }

        opfPath = resolveEpubRelativePath("", rootFilePath) || "";
        
        // Re-scan for OPF and Cover
        yauzl.open(filePath, { lazyEntries: true }, (err2, zipfile2) => {
          if (err2 || !zipfile2) return reject(err2 || new Error("Failed to re-open zip"));
          
          zipfile2.readEntry();
          zipfile2.on("entry", async (entry: yauzl.Entry) => {
            if (entry.fileName === opfPath) {
              const buffer = await readZipEntry(zipfile2, entry);
              opfContent = buffer.toString();
              const opfMeta = parseEpubOpfMetadata(opfContent);
              metadata.title = opfMeta.title;
              metadata.author = opfMeta.author;
              coverItemHref = opfMeta.coverItemHref || "";
              
              if (!coverItemHref) {
                zipfile2.close();
                return resolve({ ...metadata, needsNormalization: false });
              }
            } else if (coverItemHref) {
              const resolvedCoverPath = resolveEpubRelativePath(opfPath, coverItemHref);
              if (entry.fileName === resolvedCoverPath) {
                const coverData = await readZipEntry(zipfile2, entry);
                metadata.coverFileName = await saveCoverImage(coverData, bookId);
                zipfile2.close();
                return resolve({ ...metadata, needsNormalization: false });
              }
            }
            zipfile2.readEntry();
          });
          
          zipfile2.on("end", () => {
            zipfile2.close();
            resolve({ ...metadata, needsNormalization: false });
          });
        });
      });
      
      zipfile.on("error", reject);
    });
  });
}

async function extractEpubMetadata(
  buffer: Buffer,
  bookId: string
): Promise<{
  title?: string;
  author?: string;
  coverFileName?: string;
}> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(buffer);

  const containerXml = await zip
    .file("META-INF/container.xml")
    ?.async("string");
  if (!containerXml) return {};

  const rootFilePath = parseEpubContainerRootfilePath(containerXml);
  if (!rootFilePath) return {};

  const opfPath = resolveEpubRelativePath("", rootFilePath);
  if (!opfPath) return {};

  const opfContent = await zip.file(opfPath)?.async("string");
  if (!opfContent) return {};

  const { title, author, coverItemHref } = parseEpubOpfMetadata(opfContent);

  let coverFileName: string | undefined;
  try {
    if (coverItemHref) {
      const coverPath = resolveEpubRelativePath(opfPath, coverItemHref);
      if (!coverPath) return { title, author };

      const coverData = await zip.file(coverPath)?.async("nodebuffer");
      if (coverData) {
        coverFileName = await saveCoverImage(Buffer.from(coverData), bookId);
      }
    }
  } catch (e) {
    logger.warn("books", "Failed to extract cover", e);
  }

  return { title, author, coverFileName };
}
