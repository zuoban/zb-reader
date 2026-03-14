import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, or } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";
import { badRequest, serverError } from "@/lib/api-utils";

export async function POST(req: NextRequest) {
  // 速率限制检查：每分钟 3 次
  const rateLimitResponse = checkRateLimit(req, {
    limit: 3,
    window: 60,
    message: "注册请求过于频繁，请1分钟后再试",
  });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const { username, email, password } = await req.json();

    if (!username || !email || !password) {
      return badRequest("用户名、邮箱和密码不能为空");
    }

    if (username.length < 2 || username.length > 20) {
      return badRequest("用户名长度应在 2-20 个字符之间");
    }

    if (password.length < 6) {
      return badRequest("密码长度至少 6 个字符");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return badRequest("邮箱格式不正确");
    }

    // Check if username or email already exists
    const existing = await db.query.users.findFirst({
      where: or(eq(users.username, username), eq(users.email, email)),
    });

    if (existing) {
      if (existing.username === username) {
        return NextResponse.json(
          { error: "用户名已被注册" },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: "邮箱已被注册" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const id = uuidv4();

    await db.insert(users).values({
      id,
      username,
      email,
      password: hashedPassword,
    });

    return NextResponse.json(
      { message: "注册成功", user: { id, username, email } },
      { status: 201 }
    );
  } catch (error) {
    logger.error("register", "注册失败", error);
    return serverError("注册失败，请稍后再试");
  }
}
