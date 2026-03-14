import { NextRequest, NextResponse } from "next/server";

// 简单的内存速率限制器
// 注意：在生产环境中应使用 Redis 等分布式存储

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// 清理过期的条目（每分钟执行一次）
let lastCleanup = Date.now();
function cleanupStore() {
  const now = Date.now();
  if (now - lastCleanup > 60000) {
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetTime < now) {
        rateLimitStore.delete(key);
      }
    }
    lastCleanup = now;
  }
}

// 专门用于登录失败的速率限制
const failedLoginStore = new Map<string, { count: number; lockUntil: number }>();

/**
 * 速率限制中间件
 * @param req NextRequest 对象
 * @param options 配置选项
 * @returns 如果被限制返回 NextResponse，否则返回 null
 */
export function checkRateLimit(
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
): NextResponse | null {
  const { limit, window, key, message } = options;

  // 定期清理过期条目
  cleanupStore();

  // 获取客户端标识符
  const identifier = key
    ? key(req)
    : req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // 如果不存在或已过期，创建新条目
  if (!entry || entry.resetTime < now) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + window * 1000,
    });
    return null;
  }

  // 检查是否超过限制
  if (entry.count >= limit) {
    const resetSeconds = Math.ceil((entry.resetTime - now) / 1000);
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

  // 增加计数
  entry.count++;
  return null;
}

/**
 * 登录失败次数限制
 * @param identifier 客户端标识符（用户名或IP）
 * @param maxAttempts 最大尝试次数
 * @param lockDuration 锁定时间（秒）
 * @returns 如果被锁定返回锁定剩余时间，否则返回 null
 */
export function checkFailedLoginLimit(
  identifier: string,
  maxAttempts = 5,
  lockDuration = 300
): number | null {
  const now = Date.now();
  const entry = failedLoginStore.get(identifier);

  // 如果存在锁定记录且未过期
  if (entry && entry.lockUntil > now) {
    return Math.ceil((entry.lockUntil - now) / 1000);
  }

  // 记录失败尝试
  if (!entry) {
    failedLoginStore.set(identifier, { count: 1, lockUntil: 0 });
  } else {
    entry.count++;

    // 如果超过最大尝试次数，锁定账户
    if (entry.count >= maxAttempts) {
      entry.lockUntil = now + lockDuration * 1000;
      return lockDuration;
    }
  }

  return null;
}

/**
 * 重置登录失败计数
 * @param identifier 客户端标识符
 */
export function resetFailedLoginCount(identifier: string) {
  failedLoginStore.delete(identifier);
}

/**
 * 创建速率限制检查函数的工厂函数
 * @param limit 限制次数
 * @param window 时间窗口（秒）
 * @param message 自定义错误消息
 */
export function createRateLimiter(
  limit: number,
  window: number,
  message = "请求过于频繁，请稍后再试"
) {
  return (req: NextRequest) => checkRateLimit(req, { limit, window, message });
}