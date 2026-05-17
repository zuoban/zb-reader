import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}小时${minutes}分钟`;
  if (minutes > 0) return `${minutes}分钟`;
  return "少于1分钟";
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * 防抖函数
 */
export interface DebouncedFunction<Args extends unknown[]> {
  (...args: Args): void;
  cancel: () => void;
}

export function debounce<Args extends unknown[], This, Return>(
  fn: (this: This, ...args: Args) => Return,
  delay: number
): DebouncedFunction<Args> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const debounced = function (this: This, ...args: Args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
      timer = null;
    }, delay);
  } as DebouncedFunction<Args>;

  debounced.cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return debounced;
}

/**
 * 节流函数
 */
export function throttle<Args extends unknown[], This, Return>(
  fn: (this: This, ...args: Args) => Return,
  limit: number
): (this: This, ...args: Args) => void {
  let inThrottle = false;
  return function (this: This, ...args: Args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Shared reader settings clamp functions (used by both frontend store and backend API)
export function clampFontSize(value: number): number {
  return Math.min(28, Math.max(12, value));
}

export function clampPageWidth(value: number): number {
  return Math.min(100, Math.max(50, value));
}

export function clampTtsRate(value: number): number {
  return Math.min(5, Math.max(1, value));
}

export function clampTtsPitch(value: number): number {
  return Math.min(2, Math.max(0.5, value));
}

export function clampTtsVolume(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function clampLegadoRate(value: number): number {
  return Math.min(200, Math.max(10, value));
}

export function clampReaderSettingNumber(
  value: unknown,
  min: number,
  max: number,
  fallback: number
): number {
  const numericValue = Number(value ?? fallback);
  if (!Number.isFinite(numericValue)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, numericValue));
}

const ALLOWED_TTS_PRELOAD_COUNTS = [1, 2, 3, 5, 8] as const;
export function normalizeTtsPreloadCount(value: number): number {
  return ALLOWED_TTS_PRELOAD_COUNTS.includes(
    value as (typeof ALLOWED_TTS_PRELOAD_COUNTS)[number]
  )
    ? value
    : 5;
}

export const normalizeMicrosoftPreloadCount = normalizeTtsPreloadCount;

const ALLOWED_FONT_FAMILIES = ["system", "serif", "sans", "kaiti"] as const;
export function isValidFontFamily(value: string): value is (typeof ALLOWED_FONT_FAMILIES)[number] {
  return (ALLOWED_FONT_FAMILIES as readonly string[]).includes(value);
}

/**
 * 根据窗口宽度计算网格列数
 */
export function getColumnsFromWidth(width: number): number {
  if (width >= 1536) return 6;
  if (width >= 1280) return 5;
  if (width >= 1024) return 4;
  if (width >= 640) return 3;
  return 2;
}
