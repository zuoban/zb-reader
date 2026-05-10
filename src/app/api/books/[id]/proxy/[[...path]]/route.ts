import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { books } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getBookFilePath, bookFileExists } from "@/lib/storage";
import { logger } from "@/lib/logger";
import fs from "fs";
import { getAuthUserId, notFound, serverError } from "@/lib/api-utils";

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".xhtml": "application/xhtml+xml",
  ".css": "text/css",
  ".js": "text/javascript",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ncx": "application/x-dtbncx+xml",
  ".opf": "application/oebps-package+xml",
  ".xml": "application/xml",
  ".otf": "font/otf",
  ".ttf": "font/ttf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".eot": "application/vnd.ms-fontobject",
  ".sfnt": "application/font-sfnt",
};

function getMimeType(filePath: string): string {
  const ext = filePath.toLowerCase().substring(filePath.lastIndexOf("."));
  return MIME_TYPES[ext] || "application/octet-stream";
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; path?: string[] }> }
) {
  const authResult = await getAuthUserId();
  if (authResult.error) return authResult.error;
  const { userId } = authResult;

  const { id, path: pathSegments } = await params;
  const filePathInsideZip = pathSegments ? pathSegments.join("/") : "";

  if (!filePathInsideZip) {
    return new NextResponse("EPUB Proxy Root", { status: 200 });
  }

  try {
    const book = await db.query.books.findFirst({
      where: and(eq(books.id, id), eq(books.uploaderId, userId)),
    });

    if (!book) {
      return notFound("书籍不存在");
    }

    if (!bookFileExists(book.filePath)) {
      return notFound("文件不存在");
    }

    const fullPath = getBookFilePath(book.filePath);
    const fileBuffer = fs.readFileSync(fullPath);
    
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(fileBuffer);
    
    const file = zip.file(filePathInsideZip);
    if (!file) {
      return notFound(`文件未找到: ${filePathInsideZip}`);
    }

    const content = await file.async("nodebuffer");
    const mimeType = getMimeType(filePathInsideZip);

    return new NextResponse(content, {
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    logger.error("epub-proxy", `Failed to serve ${filePathInsideZip} for book ${id}`, error);
    return serverError("代理请求失败");
  }
}
