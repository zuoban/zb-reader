/**
 * TTS 音频 LRU 缓存
 *
 * - 最多缓存 MAX_CACHE_SIZE 条音频 Blob
 * - 以文本内容（含语音参数）的哈希作为 key，确保相同文本+相同参数命中同一缓存
 * - 缓存的是 Blob 对象（而非 blob URL），每次使用时动态创建 URL 并在使用后 revoke
 * - 缓存 Legado 返回的 audioUrl（字符串）时，直接存储 URL
 */

const MAX_CACHE_SIZE = 10;

type CacheEntry =
  | { kind: "blob"; blob: Blob }
  | { kind: "url"; audioUrl: string };

/** 简易 LRU：使用 Map 的插入顺序，最近访问的移到末尾 */
class TtsAudioLruCache {
  private map = new Map<string, CacheEntry>();

  /** 生成缓存 key：对参数对象做 djb2 哈希 */
  static hashKey(params: Record<string, unknown>): string {
    const str = JSON.stringify(params, Object.keys(params).sort());
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      // djb2: hash = hash * 33 ^ charCode
      hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
      hash = hash >>> 0; // 保持 uint32
    }
    return hash.toString(36);
  }

  get(key: string): CacheEntry | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    // 移到末尾（最近访问）
    this.map.delete(key);
    this.map.set(key, entry);
    return entry;
  }

  set(key: string, entry: CacheEntry): void {
    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= MAX_CACHE_SIZE) {
      // 淘汰最久未使用的条目（Map 的第一个 key）
      const oldestKey = this.map.keys().next().value;
      if (oldestKey !== undefined) {
        this.map.delete(oldestKey);
      }
    }
    this.map.set(key, entry);
  }

  has(key: string): boolean {
    return this.map.has(key);
  }

  get size(): number {
    return this.map.size;
  }
}

/** 全局单例，在整个阅读器页面生命周期内共享 */
export const ttsAudioCache = new TtsAudioLruCache();
export { TtsAudioLruCache };
export type { CacheEntry };
