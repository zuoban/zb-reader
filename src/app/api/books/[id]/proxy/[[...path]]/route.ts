import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { books } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getBookFilePath, bookFileExists } from "@/lib/storage";
import { logger } from "@/lib/logger";
import { getCachedEpubZip } from "@/lib/server-epub-cache";
import { badRequest, getAuthUserId, notFound, serverError } from "@/lib/api-utils";

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

export function normalizeProxyPath(pathSegments?: string[]): string | null {
  if (!pathSegments || pathSegments.length === 0) {
    return "";
  }

  const normalizedSegments = pathSegments.map((segment) => segment.trim());
  if (
    normalizedSegments.some(
      (segment) =>
        !segment ||
        segment === "." ||
        segment === ".." ||
        segment.includes("\0") ||
        segment.includes("/") ||
        segment.includes("\\") ||
        /^[a-z][a-z0-9+.-]*:/i.test(segment)
    )
  ) {
    return null;
  }

  const normalizedPath = normalizedSegments.join("/");

  // Secondary check: ensure the joined path doesn't contain traversal sequences
  // (e.g., segments like "foo.." + "..bar" could produce "foo../..bar" which is safe,
  // but "foo.." + ".." would have been caught above; this catches any remaining edge cases)
  if (normalizedPath.includes("..") || normalizedPath.startsWith("/")) {
    return null;
  }

  return normalizedPath;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; path?: string[] }> }
) {
  const authResult = await getAuthUserId();
  if (authResult.error) return authResult.error;
  const { userId } = authResult;

  const { id, path: pathSegments } = await params;
  const filePathInsideZip = normalizeProxyPath(pathSegments);
  if (filePathInsideZip === null) {
    return badRequest("无效的文件路径");
  }

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
    const zip = await getCachedEpubZip(fullPath);
    
    const file = zip.file(filePathInsideZip);
    if (!file) {
      return notFound(`文件未找到: ${filePathInsideZip}`);
    }

    const content = await file.async("nodebuffer");
    const mimeType = getMimeType(filePathInsideZip);

    return new NextResponse(new Uint8Array(content), {
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    logger.error("epub-proxy", `Failed to serve ${filePathInsideZip} for book ${id}`, error);
    return serverError("代理请求失败");
  }
}
