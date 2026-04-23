import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import type { z } from "zod";

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
 * 获取当前认证用户 ID，失败时返回未登录响应
 */
export async function getAuthUserId(): Promise<
  | { userId: string; error?: undefined }
  | { error: NextResponse; userId?: undefined }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: unauthorized() };
  }

  return { userId: session.user.id };
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

/**
 * 使用 Zod schema 校验请求体
 * @returns 校验成功返回 { data }，失败返回 NextResponse 错误响应
 */
export async function validateJson<T extends z.ZodType>(
  req: Request,
  schema: T,
): Promise<
  | { data: z.infer<T>; error?: undefined }
  | { error: NextResponse; data?: undefined }
> {
  try {
    const body = await req.json();
    const result = schema.safeParse(body);
    if (!result.success) {
      return {
        error: badRequest(result.error.issues[0]?.message || "参数错误"),
      };
    }
    return { data: result.data };
  } catch {
    return { error: badRequest("请求体格式错误") };
  }
}
