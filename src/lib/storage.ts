import fs from "fs";
import path from "path";

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

function ensureDirs() {
  for (const dir of [DATA_DIR, BOOKS_DIR, COVERS_DIR]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
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

export function saveBookFile(
  buffer: Buffer,
  bookId: string,
  format: string
): string {
  ensureDirs();
  const fileName = `${bookId}.${format}`;
  const filePath = resolveStoredFilePath(BOOKS_DIR, fileName);
  fs.writeFileSync(filePath, buffer);
  return fileName;
}

export function deleteBookFile(fileName: string): void {
  const filePath = resolveStoredFilePath(BOOKS_DIR, fileName);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

export function getBookFilePath(fileName: string): string {
  return resolveStoredFilePath(BOOKS_DIR, fileName);
}

export function bookFileExists(fileName: string): boolean {
  return fs.existsSync(resolveStoredFilePath(BOOKS_DIR, fileName));
}

export function saveCoverImage(buffer: Buffer, bookId: string): string {
  ensureDirs();
  const fileName = `${bookId}.jpg`;
  const filePath = resolveStoredFilePath(COVERS_DIR, fileName);
  fs.writeFileSync(filePath, buffer);
  return fileName;
}

export function deleteCoverImage(fileName: string): void {
  const filePath = resolveStoredFilePath(COVERS_DIR, fileName);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

export function getCoverFilePath(fileName: string): string {
  return resolveStoredFilePath(COVERS_DIR, fileName);
}

export function coverExists(fileName: string): boolean {
  return fs.existsSync(resolveStoredFilePath(COVERS_DIR, fileName));
}

export { BOOKS_DIR, COVERS_DIR, DATA_DIR };
