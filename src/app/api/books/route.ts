import { NextRequest, NextResponse } from "next/server";
import { and, count, desc, eq, isNull, or, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { db } from "@/lib/db";
import { books, readingProgress } from "@/lib/db/schema";
import { 
  deleteBookFile, 
  getBookFilePath 
} from "@/lib/storage";
import { logger } from "@/lib/logger";
import { getBookFacets, invalidateBookFacets } from "@/lib/book-facets-cache";
import { badRequest, serverError, getAuthUserId } from "@/lib/api-utils";
import { UNCATEGORIZED_CATEGORY } from "@/lib/book-category";
import { formatBytes } from "@/lib/utils";
import { MAX_EPUB_FILE_SIZE_BYTES } from "@/lib/upload-limits";
import { 
  processBookUpload, 
  EpubValidationError 
} from "@/lib/upload-pipeline";
import fs from "fs";

const DEFAULT_BOOKS_PAGE = 1;
const DEFAULT_BOOKS_LIMIT = 20;
const MAX_BOOKS_LIMIT = 100;
const MAX_BOOKS_SEARCH_LENGTH = 100;
const MAX_BOOKS_CATEGORY_LENGTH = 40;

interface UploadedEpubInfo {
  storageFormat: "epub";
  titleBase: string;
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
      const terms = search.split(/\s+/).filter(Boolean);
      if (terms.length > 0) {
        // Trigram tokenizer needs at least 3 chars to match.
        // We separate terms into FTS-compatible (3+) and LIKE-compatible (<3).
        const ftsTerms = terms.filter(t => t.length >= 3);
        const likeTerms = terms.filter(t => t.length < 3);

        let searchClause;

        if (ftsTerms.length > 0) {
          const ftsQuery = ftsTerms
            .map((t) => `"${t.replace(/"/g, '""')}"`)
            .join(" AND ");
          
          searchClause = sql`${books}.rowid IN (SELECT rowid FROM books_fts WHERE books_fts MATCH ${ftsQuery})`;
        }

        if (likeTerms.length > 0) {
          const likeClauses = likeTerms.map(t => {
            const pattern = `%${t.replace(/[%_]/g, '\\$&')}%`;
            return sql`(${books}.title LIKE ${pattern} ESCAPE '\\' OR ${books}.author LIKE ${pattern} ESCAPE '\\')`;
          });
          
          const combinedLike = and(...likeClauses);
          searchClause = searchClause ? and(searchClause, combinedLike) : combinedLike;
        }

        if (searchClause) {
          whereClause = and(whereClause, searchClause)!;
        }
      }
    }

    if (category === UNCATEGORIZED_CATEGORY) {
      whereClause = and(
        whereClause,
        or(isNull(books.category), eq(books.category, ""))
      )!;
    } else if (category) {
      whereClause = and(whereClause, eq(books.category, category))!;
    }

    const [result, totalResult, facets] = await Promise.all([
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
        ? getBookFacets(userId)
        : Promise.resolve({ allTotal: 0, categories: [] }),
    ]);
    const total = totalResult[0]?.count ?? 0;
    const allTotal = includeFacets ? facets.allTotal : total;
    const categories = includeFacets ? facets.categories : [];

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

    // Process upload using the hardened pipeline
    const { metadata, savedFileName: finalFileName } = await processBookUpload(
      file.stream(),
      bookId,
      epubInfo.storageFormat
    );
    savedFileName = finalFileName;

    let title = metadata.title || epubInfo.titleBase;
    let author = metadata.author || "未知作者";
    const coverFileName = metadata.coverFileName || null;

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
    invalidateBookFacets(userId);

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
    
    if (error instanceof EpubValidationError) {
      return badRequest(error.message);
    }

    logger.error("books", "Failed to upload book", error);
    return serverError("上传失败");
  }
}
