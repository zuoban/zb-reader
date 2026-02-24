import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { books, readingProgress } from "@/lib/db/schema";
import { eq, and, like, or, desc, inArray, count } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { saveBookFile, saveCoverImage } from "@/lib/storage";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const withProgress = searchParams.get("withProgress") === "true";
  const offset = (page - 1) * limit;

  try {
    let whereClause = eq(books.uploaderId, session.user.id);

    if (search) {
      whereClause = and(
        whereClause,
        or(
          like(books.title, `%${search}%`),
          like(books.author, `%${search}%`)
        )
      )!;
    }

    const [result, totalResult] = await Promise.all([
      db
        .select()
        .from(books)
        .where(whereClause)
        .orderBy(desc(books.updatedAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(books)
        .where(whereClause),
    ]);

    const total = totalResult[0]?.count ?? 0;

    if (!withProgress || result.length === 0) {
      return NextResponse.json({ books: result, total, page, limit });
    }

    const bookIds = result.map((b) => b.id);
    const progressRecords = await db
      .select()
      .from(readingProgress)
      .where(
        and(
          eq(readingProgress.userId, session.user.id),
          inArray(readingProgress.bookId, bookIds)
        )
      );

    const progressMap: Record<string, number> = {};
    progressRecords.forEach((p) => {
      progressMap[p.bookId] = p.progress;
    });

    return NextResponse.json({ books: result, progressMap, total, page, limit });
  } catch (error) {
    logger.error("books", "Failed to get books", error);
    return NextResponse.json({ error: "获取书籍失败" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "请选择文件" }, { status: 400 });
    }

    const fileName = file.name;
    const ext = fileName.split(".").pop()?.toLowerCase();
    const validFormats = ["epub", "pdf", "txt", "mobi"];

    if (!ext || !validFormats.includes(ext)) {
      return NextResponse.json(
        { error: "不支持的文件格式，仅支持 EPUB, PDF, TXT, MOBI" },
        { status: 400 }
      );
    }

    const bookId = uuidv4();
    const buffer = Buffer.from(await file.arrayBuffer());
    const savedFileName = saveBookFile(buffer, bookId, ext);

    let title = fileName.replace(`.${ext}`, "");
    let author = "未知作者";
    let coverFileName: string | null = null;

    if (ext === "epub") {
      try {
        const metadata = await extractEpubMetadata(buffer, bookId);
        title = metadata.title || title;
        author = metadata.author || author;
        coverFileName = metadata.coverFileName || null;
      } catch (e) {
        logger.warn("books", "Failed to extract EPUB metadata", e);
      }
    }

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
      fileSize: buffer.length,
      format: ext as "epub" | "pdf" | "txt" | "mobi",
      uploaderId: session.user.id,
    });

    const book = await db.query.books.findFirst({
      where: eq(books.id, bookId),
    });

    return NextResponse.json({ book }, { status: 201 });
  } catch (error) {
    logger.error("books", "Failed to upload book", error);
    return NextResponse.json({ error: "上传失败" }, { status: 500 });
  }
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

  const rootFileMatch = containerXml.match(/full-path="([^"]+)"/);
  if (!rootFileMatch) return {};

  const opfPath = rootFileMatch[1];
  const opfContent = await zip.file(opfPath)?.async("string");
  if (!opfContent) return {};

  const titleMatch = opfContent.match(
    /<dc:title[^>]*>([^<]+)<\/dc:title>/i
  );
  const title = titleMatch ? titleMatch[1].trim() : undefined;

  const authorMatch = opfContent.match(
    /<dc:creator[^>]*>([^<]+)<\/dc:creator>/i
  );
  const author = authorMatch ? authorMatch[1].trim() : undefined;

  let coverFileName: string | undefined;
  try {
    const coverMetaMatch = opfContent.match(
      /meta[^>]*name="cover"[^>]*content="([^"]+)"/i
    );
    let coverItemHref: string | undefined;

    if (coverMetaMatch) {
      const coverId = coverMetaMatch[1];
      const coverItemMatch = opfContent.match(
        new RegExp(`item[^>]*id="${coverId}"[^>]*href="([^"]+)"`, "i")
      );
      if (coverItemMatch) {
        coverItemHref = coverItemMatch[1];
      }
    }

    if (!coverItemHref) {
      const coverPropMatch = opfContent.match(
        /item[^>]*properties="cover-image"[^>]*href="([^"]+)"/i
      );
      if (coverPropMatch) {
        coverItemHref = coverPropMatch[1];
      }
    }

    if (coverItemHref) {
      const opfDir = opfPath.substring(0, opfPath.lastIndexOf("/") + 1);
      const coverPath = coverItemHref.startsWith("/")
        ? coverItemHref.substring(1)
        : opfDir + coverItemHref;

      const coverData = await zip.file(coverPath)?.async("nodebuffer");
      if (coverData) {
        coverFileName = saveCoverImage(Buffer.from(coverData), bookId);
      }
    }
  } catch (e) {
    logger.warn("books", "Failed to extract cover", e);
  }

  return { title, author, coverFileName };
}
