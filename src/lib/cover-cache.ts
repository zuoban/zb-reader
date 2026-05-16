import fs from "fs";
import sharp from "sharp";
import { getCoverFilePath, coverExists } from "@/lib/storage";

// Global sharp configuration to limit memory usage
sharp.cache({ items: 50, files: 20, memory: 50 }); // 50MB memory limit for sharp's internal cache
if (process.env.NODE_ENV === "development") {
  sharp.concurrency(1); // Reduce memory spikes in dev
}

interface CacheEntry {
  buffer: Buffer;
  timestamp: number;
}

// LRU cache: Map preserves insertion order, we'll move accessed items to end
const coverCache = new Map<string, CacheEntry>();

// Cache limits
const MAX_CACHE_SIZE = 500; // Increased max cached items for thumbnails
const MAX_CACHE_AGE = 1000 * 60 * 60 * 24; // 24 hours in milliseconds
const MAX_TOTAL_SIZE = 100 * 1024 * 1024; // 100MB total cache size limit

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
  coverFileName: string,
  width?: number,
  format: 'jpeg' | 'webp' | 'avif' = 'jpeg'
): Promise<{ buffer: Buffer, contentType: string } | null> {
  const cacheKey = `${coverFileName}:${width || 'original'}:${format}`;
  const entry = coverCache.get(cacheKey);

  if (entry) {
    if (isEntryExpired(entry)) {
      coverCache.delete(cacheKey);
      currentTotalSize -= getCacheSize(entry.buffer);
      return null;
    }

    // Move to end (most recently used)
    coverCache.delete(cacheKey);
    coverCache.set(cacheKey, entry);
    return { buffer: entry.buffer, contentType: `image/${format}` };
  }

  // Cache miss - load from disk
  if (!coverExists(coverFileName)) {
    return null;
  }

  const coverPath = getCoverFilePath(coverFileName);
  try {
  const initialBuffer = fs.readFileSync(coverPath);
    let finalBuffer: Buffer = initialBuffer;
    
    if (width || format !== 'jpeg') {
      let image = sharp(initialBuffer);
      
      if (width) {
        image = image.resize({ width, withoutEnlargement: true });
      }
      
      if (format === 'webp') {
        image = image.webp({ quality: 80 });
      } else if (format === 'avif') {
        image = image.avif({ quality: 75 });
      } else {
        image = image.jpeg({ quality: 85 });
      }
      
      finalBuffer = Buffer.from(await image.toBuffer());
    }

    // Add to cache
    currentTotalSize += getCacheSize(finalBuffer);
    coverCache.set(cacheKey, {
      buffer: finalBuffer,
      timestamp: Date.now(),
    });

    evictIfNeeded();

    return { buffer: finalBuffer, contentType: `image/${format}` };
  } catch {
    return null;
  }
}

export function invalidateCoverCache(coverFileName: string): void {
  // Remove all cached versions for this cover
  const keysToRemove: string[] = [];
  for (const key of coverCache.keys()) {
    if (key.startsWith(`${coverFileName}:`)) {
      keysToRemove.push(key);
    }
  }
  
  for (const key of keysToRemove) {
    const entry = coverCache.get(key);
    if (entry) {
      currentTotalSize -= getCacheSize(entry.buffer);
      coverCache.delete(key);
    }
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
