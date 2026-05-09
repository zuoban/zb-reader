import fs from "fs";
import { getCoverFilePath, coverExists } from "@/lib/storage";

interface CacheEntry {
  buffer: Buffer;
  timestamp: number;
}

// LRU cache: Map preserves insertion order, we'll move accessed items to end
const coverCache = new Map<string, CacheEntry>();

// Cache limits
const MAX_CACHE_SIZE = 100; // Maximum number of cached covers
const MAX_CACHE_AGE = 1000 * 60 * 60; // 1 hour in milliseconds
const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB total cache size limit

let currentTotalSize = 0;

function getCacheSize(buffer: Buffer): number {
  return buffer.length;
}

function evictIfNeeded(): void {
  // Evict oldest entries if cache is too large
  while (
    coverCache.size > MAX_CACHE_SIZE ||
    currentTotalSize > MAX_TOTAL_SIZE
  ) {
    const oldestKey = coverCache.keys().next().value;
    if (!oldestKey) break;

    const oldestEntry = coverCache.get(oldestKey);
    if (oldestEntry) {
      currentTotalSize -= getCacheSize(oldestEntry.buffer);
      coverCache.delete(oldestKey);
    }
  }
}

function isEntryExpired(entry: CacheEntry): boolean {
  return Date.now() - entry.timestamp > MAX_CACHE_AGE;
}

export async function getCachedCover(
  coverFileName: string
): Promise<Buffer | null> {
  const entry = coverCache.get(coverFileName);

  if (entry) {
    if (isEntryExpired(entry)) {
      coverCache.delete(coverFileName);
      currentTotalSize -= getCacheSize(entry.buffer);
      return null;
    }

    // Move to end (most recently used)
    coverCache.delete(coverFileName);
    coverCache.set(coverFileName, entry);
    return entry.buffer;
  }

  // Cache miss - load from disk
  if (!coverExists(coverFileName)) {
    return null;
  }

  const coverPath = getCoverFilePath(coverFileName);
  try {
    const buffer = fs.readFileSync(coverPath);

    // Add to cache
    currentTotalSize += getCacheSize(buffer);
    coverCache.set(coverFileName, {
      buffer,
      timestamp: Date.now(),
    });

    evictIfNeeded();

    return buffer;
  } catch {
    return null;
  }
}

export function invalidateCoverCache(coverFileName: string): void {
  const entry = coverCache.get(coverFileName);
  if (entry) {
    currentTotalSize -= getCacheSize(entry.buffer);
    coverCache.delete(coverFileName);
  }
}

export function clearCoverCache(): void {
  coverCache.clear();
  currentTotalSize = 0;
}

export function getCoverCacheStats(): {
  size: number;
  totalSize: number;
  entries: Array<{ key: string; age: number }>;
} {
  const entries = Array.from(coverCache.entries()).map(([key, entry]) => ({
    key,
    age: Date.now() - entry.timestamp,
  }));

  return {
    size: coverCache.size,
    totalSize: currentTotalSize,
    entries,
  };
}
