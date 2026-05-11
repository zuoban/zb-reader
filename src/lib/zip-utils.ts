import yauzl from "yauzl";
import fs from "fs";

interface ZipContentCacheEntry {
  buffer: Buffer;
  size: number;
  timestamp: number;
}

const zipContentCache = new Map<string, ZipContentCacheEntry>();
const MAX_ZIP_CONTENT_CACHE_ITEMS = 200;
const MAX_ZIP_CONTENT_CACHE_BYTES = 64 * 1024 * 1024;
const MAX_ZIP_CONTENT_CACHE_ENTRY_BYTES = 2 * 1024 * 1024;
const ZIP_CONTENT_CACHE_TTL_MS = 1000 * 60 * 30;

let zipContentCacheBytes = 0;

function getZipContentCacheKey(zipPath: string, filePathInsideZip: string): string | null {
  try {
    const stat = fs.statSync(zipPath);
    return `${zipPath}:${stat.size}:${stat.mtimeMs}:${filePathInsideZip}`;
  } catch {
    return null;
  }
}

function getZipContentCache(cacheKey: string | null): Buffer | null {
  if (!cacheKey) return null;

  const entry = zipContentCache.get(cacheKey);
  if (!entry) return null;

  if (Date.now() - entry.timestamp > ZIP_CONTENT_CACHE_TTL_MS) {
    zipContentCache.delete(cacheKey);
    zipContentCacheBytes -= entry.size;
    return null;
  }

  zipContentCache.delete(cacheKey);
  zipContentCache.set(cacheKey, entry);
  return entry.buffer;
}

function evictZipContentCache(): void {
  while (
    zipContentCache.size > MAX_ZIP_CONTENT_CACHE_ITEMS ||
    zipContentCacheBytes > MAX_ZIP_CONTENT_CACHE_BYTES
  ) {
    const oldestKey = zipContentCache.keys().next().value;
    if (!oldestKey) return;

    const oldestEntry = zipContentCache.get(oldestKey);
    if (oldestEntry) {
      zipContentCacheBytes -= oldestEntry.size;
    }
    zipContentCache.delete(oldestKey);
  }
}

function setZipContentCache(cacheKey: string | null, buffer: Buffer): void {
  if (!cacheKey || buffer.length > MAX_ZIP_CONTENT_CACHE_ENTRY_BYTES) return;

  const existing = zipContentCache.get(cacheKey);
  if (existing) {
    zipContentCacheBytes -= existing.size;
    zipContentCache.delete(cacheKey);
  }

  zipContentCache.set(cacheKey, {
    buffer,
    size: buffer.length,
    timestamp: Date.now(),
  });
  zipContentCacheBytes += buffer.length;
  evictZipContentCache();
}

/**
 * Memory-efficiently extract a single file from a ZIP archive.
 * Does not load the whole ZIP into memory.
 */
export async function extractFileFromZip(
  zipPath: string,
  filePathInsideZip: string
): Promise<Buffer | null> {
  const cacheKey = getZipContentCacheKey(zipPath, filePathInsideZip);
  const cached = getZipContentCache(cacheKey);
  if (cached) return cached;

  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err) return reject(err);
      if (!zipfile) return reject(new Error("Failed to open zip file"));

      zipfile.readEntry();
      zipfile.on("entry", (entry) => {
        if (entry.fileName === filePathInsideZip) {
          zipfile.openReadStream(entry, (err2, readStream) => {
            if (err2 || !readStream) {
              zipfile.close();
              return reject(err2 || new Error("Failed to open read stream"));
            }

            const chunks: Buffer[] = [];
            readStream.on("data", (chunk) => chunks.push(chunk));
            readStream.on("end", () => {
              zipfile.close();
              const buffer = Buffer.concat(chunks);
              setZipContentCache(cacheKey, buffer);
              resolve(buffer);
            });
            readStream.on("error", (err3) => {
              zipfile.close();
              reject(err3);
            });
          });
        } else {
          zipfile.readEntry();
        }
      });

      zipfile.on("end", () => {
        // If we reached the end and didn't find the file
        zipfile.close();
        resolve(null);
      });

      zipfile.on("error", (err4) => {
        zipfile.close();
        reject(err4);
      });
    });
  });
}

/**
 * Get a list of all files in a ZIP archive without loading it all.
 */
export async function listZipFiles(zipPath: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const files: string[] = [];
    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err) return reject(err);
      if (!zipfile) return reject(new Error("Failed to open zip file"));

      zipfile.readEntry();
      zipfile.on("entry", (entry) => {
        if (!entry.fileName.endsWith("/")) {
          files.push(entry.fileName);
        }
        zipfile.readEntry();
      });

      zipfile.on("end", () => {
        zipfile.close();
        resolve(files);
      });

      zipfile.on("error", (err2) => {
        zipfile.close();
        reject(err2);
      });
    });
  });
}
