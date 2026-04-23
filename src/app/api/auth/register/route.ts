import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq, or } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";
import { serverError, validateJson } from "@/lib/api-utils";
import { registerSchema } from "@/lib/validations";

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
    const validation = await validateJson(req, registerSchema);
    if (validation.error) return validation.error;
    const { username, email, password } = validation.data;

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
