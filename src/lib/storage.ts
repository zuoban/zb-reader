import * as fsAsync from "fs/promises";
import path from "path";
import fsSync from "fs";

const DATA_DIR = path.join(/*turbopackIgnore: true*/ process.cwd(), "data");
const BOOKS_DIR = path.join(/*turbopackIgnore: true*/ process.cwd(), "data/books");
const COVERS_DIR = path.join(/*turbopackIgnore: true*/ process.cwd(), "data/covers");
const SAFE_STORED_FILE_NAME_REGEX = /^[A-Za-z0-9._-]+$/;

export class StoragePathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StoragePathError";
  }
}

async function ensureDirs() {
  for (const dir of [DATA_DIR, BOOKS_DIR, COVERS_DIR]) {
    if (!fsSync.existsSync(dir)) {
      await fsAsync.mkdir(dir, { recursive: true });
    }
  }
}

function resolveStoredFilePath(baseDir: string, fileName: string): string {
  const normalizedFileName = fileName.trim();
  if (
    !normalizedFileName ||
    normalizedFileName === "." ||
    normalizedFileName === ".." ||
    normalizedFileName.includes("\0") ||
    normalizedFileName.includes("/") ||
    normalizedFileName.includes("\\") ||
    !SAFE_STORED_FILE_NAME_REGEX.test(normalizedFileName)
  ) {
    throw new StoragePathError("不安全的存储文件名");
  }

  const resolvedBaseDir = path.resolve(baseDir);
  const resolvedPath = path.resolve(resolvedBaseDir, normalizedFileName);
  const basePrefix = `${resolvedBaseDir}${path.sep}`;
  if (!resolvedPath.startsWith(basePrefix)) {
    throw new StoragePathError("不安全的存储文件路径");
  }

  return resolvedPath;
}

export async function saveBookFile(
  buffer: Buffer,
  bookId: string,
  format: string
): Promise<string> {
  await ensureDirs();
  const fileName = `${bookId}.${format}`;
  const filePath = resolveStoredFilePath(BOOKS_DIR, fileName);
  await fsAsync.writeFile(filePath, buffer);
  return fileName;
}

export async function saveBookFileFromStream(
  stream: ReadableStream | NodeJS.ReadableStream,
  bookId: string,
  format: string
): Promise<string> {
  await ensureDirs();
  const fileName = `${bookId}.${format}`;
  const filePath = resolveStoredFilePath(BOOKS_DIR, fileName);
  
  const writeStream = fsSync.createWriteStream(filePath);
  
  if ("getReader" in stream) {
    // Web ReadableStream
    const reader = stream.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      writeStream.write(Buffer.from(value));
    }
    writeStream.end();
  } else {
    // NodeJS ReadableStream
    await new Promise<void>((resolve, reject) => {
      stream.pipe(writeStream);
      stream.on("error", reject);
      writeStream.on("finish", () => resolve());
      writeStream.on("error", reject);
    });
  }
  
  return fileName;
}

export async function deleteBookFile(fileName: string): Promise<void> {
  const filePath = resolveStoredFilePath(BOOKS_DIR, fileName);
  if (fsSync.existsSync(filePath)) {
    await fsAsync.unlink(filePath);
  }
}

export function getBookFilePath(fileName: string): string {
  return resolveStoredFilePath(BOOKS_DIR, fileName);
}

export async function bookFileExists(fileName: string): Promise<boolean> {
  const filePath = resolveStoredFilePath(BOOKS_DIR, fileName);
  try {
    await fsAsync.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function saveCoverImage(buffer: Buffer, bookId: string): Promise<string> {
  await ensureDirs();
  const fileName = `${bookId}.jpg`;
  const filePath = resolveStoredFilePath(COVERS_DIR, fileName);
  await fsAsync.writeFile(filePath, buffer);
  return fileName;
}

export async function deleteCoverImage(fileName: string): Promise<void> {
  const filePath = resolveStoredFilePath(COVERS_DIR, fileName);
  if (fsSync.existsSync(filePath)) {
    await fsAsync.unlink(filePath);
  }
}

export function getCoverFilePath(fileName: string): string {
  return resolveStoredFilePath(COVERS_DIR, fileName);
}

export async function coverExists(fileName: string): Promise<boolean> {
  const filePath = resolveStoredFilePath(COVERS_DIR, fileName);
  try {
    await fsAsync.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export { BOOKS_DIR, COVERS_DIR, DATA_DIR };
