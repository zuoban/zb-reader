import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * 创建未认证错误响应
 */
export function unauthorized(message = "未登录"): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 });
}

/**
 * 创建参数错误响应
 */
export function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}

/**
 * 创建服务器错误响应
 */
export function serverError(message = "服务器错误"): NextResponse {
  return NextResponse.json({ error: message }, { status: 500 });
}

/**
 * 创建未找到资源响应
 */
export function notFound(message = "资源不存在"): NextResponse {
  return NextResponse.json({ error: message }, { status: 404 });
}

/**
 * 创建禁止访问响应
 */
export function forbidden(message = "无权访问"): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 });
}

/**
 * 检查用户是否已认证
 * @returns 如果未认证返回 NextResponse，否则返回 null
 */
export async function requireAuth(): Promise<NextResponse | null> {
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorized();
  }
  return null;
}

/**
 * 获取当前用户 ID
 * @throws 如果用户未认证则抛出错误
 */
export async function getUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("未登录");
  }
  return session.user.id;
}