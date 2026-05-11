import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

// Rate limit table is created on-demand if it doesn't exist
let rateLimitTableInitialized = false;

async function ensureRateLimitTable() {
  if (rateLimitTableInitialized) return;

  try {
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS rate_limits (
        key TEXT PRIMARY KEY,
        count INTEGER NOT NULL DEFAULT 1,
        reset_at INTEGER NOT NULL
      )
    `);

    // Failed login tracking table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS failed_logins (
        key TEXT PRIMARY KEY,
        count INTEGER NOT NULL DEFAULT 1,
        lock_until INTEGER NOT NULL DEFAULT 0
      )
    `);

    rateLimitTableInitialized = true;
  } catch (error) {
    // Table creation failed, fall back to in-memory
    logger.warn("rate-limit", "Failed to create rate limit tables, using in-memory store", error);
  }
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory fallback
const rateLimitFallback = new Map<string, RateLimitEntry>();

async function getRateLimitEntry(identifier: string, window: number): Promise<RateLimitEntry> {
  await ensureRateLimitTable();

  const now = Date.now();
  const resetAt = now + window * 1000;

  try {
    const row = await db.get<{ count: number; reset_at: number }>(
      sql`SELECT count, reset_at FROM rate_limits WHERE key = ${identifier}`
    );

    if (!row || row.reset_at < now) {
      // Create new entry
      await db.run(sql`
        INSERT OR REPLACE INTO rate_limits (key, count, reset_at)
        VALUES (${identifier}, 1, ${resetAt})
      `);
      return { count: 1, resetTime: resetAt };
    }

    // Increment count
    await db.run(sql`
      UPDATE rate_limits SET count = count + 1 WHERE key = ${identifier}
    `);
    return { count: row.count + 1, resetTime: row.reset_at };
  } catch {
    // Fall back to in-memory
    return getFallbackEntry(identifier, window);
  }
}

function getFallbackEntry(identifier: string, window: number): RateLimitEntry {
  const now = Date.now();
  const entry = rateLimitFallback.get(identifier);

  if (!entry || entry.resetTime < now) {
    const newEntry = { count: 1, resetTime: now + window * 1000 };
    rateLimitFallback.set(identifier, newEntry);
    return newEntry;
  }

  entry.count++;
  return entry;
}

// Failed login in-memory fallback
const failedLoginFallback = new Map<string, { count: number; lockUntil: number }>();

interface FailedLoginEntry {
  count: number;
  lockUntil: number;
}

async function getFailedLoginEntry(identifier: string): Promise<FailedLoginEntry> {
  await ensureRateLimitTable();

  try {
    const row = await db.get<{ count: number; lock_until: number }>(
      sql`SELECT count, lock_until FROM failed_logins WHERE key = ${identifier}`
    );

    if (!row) {
      await db.run(sql`
        INSERT OR REPLACE INTO failed_logins (key, count, lock_until)
        VALUES (${identifier}, 1, 0)
      `);
      return { count: 1, lockUntil: 0 };
    }

    return { count: row.count, lockUntil: row.lock_until };
  } catch {
    return getFallbackFailedLoginEntry(identifier);
  }
}

function getFallbackFailedLoginEntry(identifier: string): FailedLoginEntry {
  const entry = failedLoginFallback.get(identifier);
  return entry || { count: 0, lockUntil: 0 };
}

async function updateFailedLoginEntry(identifier: string, count: number, lockUntil: number): Promise<void> {
  await ensureRateLimitTable();

  try {
    await db.run(sql`
      INSERT OR REPLACE INTO failed_logins (key, count, lock_until)
      VALUES (${identifier}, ${count}, ${lockUntil})
    `);
  } catch {
    // Fall back to in-memory
    failedLoginFallback.set(identifier, { count, lockUntil });
  }
}

/**
 * 速率限制中间件
 * @param req NextRequest 对象
 * @param options 配置选项
 * @returns 如果被限制返回 NextResponse，否则返回 null
 */
export async function checkRateLimit(
  req: NextRequest,
  options: {
    /** 限制次数 */
    limit: number;
    /** 时间窗口（秒） */
    window: number;
    /** 标识符提取函数，默认使用 IP */
    key?: (req: NextRequest) => string;
    /** 自定义错误消息 */
    message?: string;
  }
): Promise<NextResponse | null> {
  const { limit, window, key, message } = options;

  // 获取客户端标识符
  const identifier = key
    ? key(req)
    : req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

  const entry = await getRateLimitEntry(identifier, window);

  // 检查是否超过限制
  if (entry.count >= limit) {
    const resetSeconds = Math.ceil((entry.resetTime - Date.now()) / 1000);
    return NextResponse.json(
      {
        error: message || "请求过于频繁，请稍后再试",
        retryAfter: resetSeconds,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(resetSeconds),
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(entry.resetTime),
        },
      }
    );
  }

  return null;
}

/**
 * 登录失败次数限制
 * @param identifier 客户端标识符
 * @param maxAttempts 最大尝试次数
 * @param lockDuration 锁定时间（秒）
 * @returns 如果超过限制返回锁定剩余秒数，否则返回 null
 */
export async function checkFailedLoginLimit(
  identifier: string,
  maxAttempts = 5,
  lockDuration = 300
): Promise<number | null> {
  const now = Date.now();
  const entry = await getFailedLoginEntry(identifier);

  // 如果处于锁定状态且未过期
  if (entry.lockUntil > now) {
    return Math.ceil((entry.lockUntil - now) / 1000);
  }

  // 如果锁定已过期，重置
  if (entry.lockUntil > 0 && entry.lockUntil <= now) {
    await updateFailedLoginEntry(identifier, 0, 0);
  }

  // 增加计数
  const newCount = entry.count + 1;

  // 如果超过最大尝试次数，锁定
  if (newCount >= maxAttempts) {
    const lockUntil = now + lockDuration * 1000;
    await updateFailedLoginEntry(identifier, newCount, lockUntil);
    return lockDuration;
  }

  await updateFailedLoginEntry(identifier, newCount, 0);
  return null;
}

/**
 * 重置登录失败计数
 * @param identifier 客户端标识符
 */
export async function resetFailedLoginCount(identifier: string): Promise<void> {
  await ensureRateLimitTable();

  try {
    await db.run(sql`DELETE FROM failed_logins WHERE key = ${identifier}`);
  } catch {
    failedLoginFallback.delete(identifier);
  }
}
