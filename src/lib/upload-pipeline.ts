import * as fsAsync from "fs/promises";
import yauzl from "yauzl";
import JSZip from "jszip";
import { logger } from "@/lib/logger";
import { saveCoverImage, moveBookFromTemp, saveBookToTemp } from "@/lib/storage";
import { MAX_EPUB_FILE_SIZE_BYTES } from "@/lib/upload-limits";

export const MAX_EPUB_ENTRY_COUNT = 10000;
export const MAX_EPUB_UNCOMPRESSED_SIZE_BYTES = MAX_EPUB_FILE_SIZE_BYTES * 3;
export const EPUB_MAGIC_BYTES = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);

export interface ExtractedEpubMetadata {
  title?: string;
  author?: string;
  coverFileName?: string;
  needsNormalization: boolean;
}

export class EpubValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EpubValidationError";
  }
}

export function hasEpubMagicBytes(buffer: Buffer): boolean {
  if (buffer.length < EPUB_MAGIC_BYTES.length) return false;
  for (let i = 0; i < EPUB_MAGIC_BYTES.length; i++) {
    if (buffer[i] !== EPUB_MAGIC_BYTES[i]) return false;
  }
  return true;
}

export function validateZipEntryPath(pathName: string): boolean {
  const normalized = pathName.replace(/\\/g, "/");
  if (normalized.startsWith("/") || normalized.includes("../") || normalized.includes("./")) {
    return false;
  }
  return true;
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

export async function validateAndExtractMetadataFromFile(
  filePath: string,
  bookId: string
): Promise<ExtractedEpubMetadata> {
  return new Promise((resolve, reject) => {
    yauzl.open(filePath, { lazyEntries: true }, async (err, zipfile) => {
      if (err) return reject(err);
      if (!zipfile) return reject(new Error("Failed to open zip file"));

      let entryCount = 0;
      let totalUncompressedSize = 0;
      let containerXmlPath = "";
      let containerXmlContent = "";
      let folderPrefix = "";
      let opfContent = "";
      let coverItemHref = "";
      const metadata: Omit<ExtractedEpubMetadata, "needsNormalization"> = {};

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
          containerXmlPath = entry.fileName;
          try {
            const buffer = await readZipEntry(zipfile, entry);
            containerXmlContent = buffer.toString();
          } catch {
            zipfile.close();
            return reject(new EpubValidationError("无法读取 container.xml"));
          }
        } else if (!containerXmlPath && entry.fileName.endsWith("/META-INF/container.xml")) {
          // Nested folder structure: "BookName.epub/META-INF/container.xml"
          folderPrefix = entry.fileName.split("/META-INF/")[0] + "/";
          containerXmlPath = entry.fileName;
          try {
            const buffer = await readZipEntry(zipfile, entry);
            containerXmlContent = buffer.toString();
          } catch {
            zipfile.close();
            return reject(new EpubValidationError("无法读取 container.xml"));
          }
        }

        zipfile.readEntry();
      });

      zipfile.on("end", async () => {
        if (!containerXmlPath) {
          zipfile.close();
          return resolve({ needsNormalization: true });
        }

        const hasPrefix = folderPrefix.length > 0;

        const rootFilePath = parseEpubContainerRootfilePath(containerXmlContent);
        if (!rootFilePath) {
          zipfile.close();
          return resolve({ ...metadata, needsNormalization: !hasPrefix });
        }

        const prefixedOpfPath = hasPrefix
          ? `${folderPrefix}${rootFilePath}`
          : rootFilePath;

        // Re-scan for OPF and Cover
        yauzl.open(filePath, { lazyEntries: true }, (err2, zipfile2) => {
          if (err2 || !zipfile2) return reject(err2 || new Error("Failed to re-open zip"));

          zipfile2.readEntry();
          zipfile2.on("entry", async (entry: yauzl.Entry) => {
            if (entry.fileName === prefixedOpfPath) {
              try {
                const buffer = await readZipEntry(zipfile2, entry);
                opfContent = buffer.toString();
                const opfMeta = parseEpubOpfMetadata(opfContent);
                metadata.title = opfMeta.title;
                metadata.author = opfMeta.author;
                coverItemHref = opfMeta.coverItemHref || "";

                if (!coverItemHref) {
                  zipfile2.close();
                  return resolve({ ...metadata, needsNormalization: hasPrefix });
                }
              } catch {
                zipfile2.close();
                return reject(new EpubValidationError("无法读取 OPF 文件"));
              }
            } else if (coverItemHref) {
              // Resolve cover path relative to the OPF file's directory
              const fullCoverPath = resolveEpubRelativePath(prefixedOpfPath, coverItemHref);
              if (fullCoverPath && entry.fileName === fullCoverPath) {
                try {
                  const coverData = await readZipEntry(zipfile2, entry);
                  metadata.coverFileName = await saveCoverImage(coverData, bookId);
                  zipfile2.close();
                  return resolve({ ...metadata, needsNormalization: hasPrefix });
                } catch (_e) {
                  logger.warn("books", "Failed to extract cover", _e);
                  // Non-fatal, continue without cover
                }
              }
            }
            zipfile2.readEntry();
          });

          zipfile2.on("end", () => {
            zipfile2.close();
            resolve({ ...metadata, needsNormalization: hasPrefix });
          });

          zipfile2.on("error", (_e) => {
            zipfile2.close();
            reject(_e);
          });
        });
      });

      zipfile.on("error", (_e) => {
        zipfile.close();
        reject(_e);
      });
    });
  });
}

/**
 * Repackage an EPUB zip that has all entries nested under a single folder prefix.
 * Strips the common folder prefix so that entries are at the zip root.
 */
export async function repackageEpubWithoutFolderPrefix(zipPath: string): Promise<Buffer> {
  const zipData = await fsAsync.readFile(zipPath);
  const jszip = new JSZip();
  const originalZip = await jszip.loadAsync(zipData);

  const filePaths = Object.keys(originalZip.files).filter(
    (p) => !originalZip.files[p].dir
  );
  if (filePaths.length === 0) {
    throw new EpubValidationError("ZIP 文件为空");
  }

  // Find the common root folder prefix (e.g., "BookName.epub/")
  const commonPrefix = findCommonFolderPrefix(filePaths);
  if (!commonPrefix) {
    throw new EpubValidationError("无法确定 EPUB 文件夹前缀");
  }

  // Create a new zip with flattened paths
  const newZip = new JSZip();
  for (const [relativePath, zipEntry] of Object.entries(originalZip.files)) {
    const strippedPath = relativePath.startsWith(commonPrefix)
      ? relativePath.slice(commonPrefix.length)
      : relativePath;

    if (zipEntry.dir) continue;

    const content = await zipEntry.async("nodebuffer");
    newZip.file(strippedPath, content);
  }

  return newZip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 0 },
  });
}

export function findCommonFolderPrefix(filePaths: string[]): string | null {
  // All paths should share a common first segment (folder name)
  const firstSegment = filePaths[0]?.split("/")[0];
  if (!firstSegment) return null;

  const prefix = firstSegment + "/";
  const allHavePrefix = filePaths.every((p) => p.startsWith(prefix));
  return allHavePrefix ? prefix : null;
}

export async function processBookUpload(
  stream: ReadableStream | NodeJS.ReadableStream,
  bookId: string,
  storageFormat: "epub"
): Promise<{ 
  metadata: ExtractedEpubMetadata; 
  savedFileName: string;
}> {
  let tempPath: string | null = null;
  let savedFileName: string | null = null;

  try {
    // 1. Stage to temp
    tempPath = await saveBookToTemp(stream, bookId, storageFormat);
    
    // 2. Validate magic bytes
    const fd = await fsAsync.open(tempPath, "r");
    const magicBuffer = Buffer.alloc(EPUB_MAGIC_BYTES.length);
    await fd.read(magicBuffer, 0, EPUB_MAGIC_BYTES.length, 0);
    await fd.close();

    if (!hasEpubMagicBytes(magicBuffer)) {
      throw new EpubValidationError("文件内容无效，不是有效的 EPUB 文件");
    }

    // 3. Extract metadata & validate ZIP
    const metadata = await validateAndExtractMetadataFromFile(tempPath, bookId);

    // 4. Repackage if EPUB entries are nested under a folder prefix
    if (metadata.needsNormalization) {
      const repackaged = await repackageEpubWithoutFolderPrefix(tempPath);
      await fsAsync.writeFile(tempPath, repackaged);
    }

    // 5. Commit to storage
    savedFileName = await moveBookFromTemp(tempPath, bookId, storageFormat);
    tempPath = null; // No longer in temp

    return { metadata, savedFileName };
  } catch (error) {
    if (tempPath) {
      await fsAsync.unlink(tempPath).catch(() => {});
    }
    throw error;
  }
}
