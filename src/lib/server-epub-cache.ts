import fs from "fs";
import JSZip from "jszip";

const MAX_CACHED_EPUBS = 8;

interface CachedEpubZip {
  mtimeMs: number;
  size: number;
  zip: JSZip;
}

const epubZipCache = new Map<string, CachedEpubZip>();

function getFileFingerprint(filePath: string) {
  const stat = fs.statSync(filePath);
  return {
    mtimeMs: stat.mtimeMs,
    size: stat.size,
  };
}

function rememberZip(filePath: string, entry: CachedEpubZip) {
  epubZipCache.delete(filePath);
  epubZipCache.set(filePath, entry);

  while (epubZipCache.size > MAX_CACHED_EPUBS) {
    const oldestKey = epubZipCache.keys().next().value;
    if (!oldestKey) break;
    epubZipCache.delete(oldestKey);
  }
}

export async function getCachedEpubZip(filePath: string): Promise<JSZip> {
  const fingerprint = getFileFingerprint(filePath);
  const cached = epubZipCache.get(filePath);

  if (
    cached &&
    cached.mtimeMs === fingerprint.mtimeMs &&
    cached.size === fingerprint.size
  ) {
    rememberZip(filePath, cached);
    return cached.zip;
  }

  const fileBuffer = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(fileBuffer);
  rememberZip(filePath, { ...fingerprint, zip });
  return zip;
}

export function clearEpubZipCache(filePath?: string): void {
  if (filePath) {
    epubZipCache.delete(filePath);
    return;
  }

  epubZipCache.clear();
}
