import * as fsAsync from "fs/promises";
import path from "path";
import fsSync from "fs";
import { once } from "events";

const DATA_DIR = path.join(/*turbopackIgnore: true*/ process.cwd(), "data");
const BOOKS_DIR = path.join(/*turbopackIgnore: true*/ process.cwd(), "data/books");
const COVERS_DIR = path.join(/*turbopackIgnore: true*/ process.cwd(), "data/covers");
const TEMP_DIR = path.join(/*turbopackIgnore: true*/ process.cwd(), "data/temp");
const SAFE_STORED_FILE_NAME_REGEX = /^[A-Za-z0-9._-]+$/;

export class StoragePathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StoragePathError";
  }
}

async function ensureDirs() {
  for (const dir of [DATA_DIR, BOOKS_DIR, COVERS_DIR, TEMP_DIR]) {
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
    await writeWebStreamToFile(stream, writeStream);
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

export async function saveBookToTemp(
  stream: ReadableStream | NodeJS.ReadableStream,
  bookId: string,
  format: string
): Promise<string> {
  await ensureDirs();
  const fileName = `${bookId}.${format}`;
  const filePath = resolveStoredFilePath(TEMP_DIR, fileName);

  const writeStream = fsSync.createWriteStream(filePath);

  if ("getReader" in stream) {
    await writeWebStreamToFile(stream, writeStream);
  } else {
    await new Promise<void>((resolve, reject) => {
      stream.pipe(writeStream);
      stream.on("error", reject);
      writeStream.on("finish", () => resolve());
      writeStream.on("error", reject);
    });
  }

  return filePath;
}

export async function moveBookFromTemp(
  tempPath: string,
  bookId: string,
  format: string
): Promise<string> {
  await ensureDirs();
  const fileName = `${bookId}.${format}`;
  const destPath = resolveStoredFilePath(BOOKS_DIR, fileName);
  await fsAsync.rename(tempPath, destPath);
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

async function writeWebStreamToFile(
  stream: ReadableStream,
  writeStream: fsSync.WriteStream
): Promise<void> {
  const reader = stream.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      if (!writeStream.write(Buffer.from(value))) {
        await waitForWriteStreamEvent(writeStream, "drain");
      }
    }

    writeStream.end();
    await waitForWriteStreamEvent(writeStream, "finish");
  } catch (error) {
    writeStream.destroy(error instanceof Error ? error : undefined);
    throw error;
  } finally {
    reader.releaseLock();
  }
}

async function waitForWriteStreamEvent(
  writeStream: fsSync.WriteStream,
  eventName: "drain" | "finish"
): Promise<void> {
  await Promise.race([
    once(writeStream, eventName),
    once(writeStream, "error").then(([error]) => {
      throw error;
    }),
  ]);
}
