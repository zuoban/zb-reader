import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, or } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  try {
    const { username, email, password } = await req.json();

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: "用户名、邮箱和密码不能为空" },
        { status: 400 }
      );
    }

    if (username.length < 2 || username.length > 20) {
      return NextResponse.json(
        { error: "用户名长度应在 2-20 个字符之间" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "密码长度至少 6 个字符" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "邮箱格式不正确" },
        { status: 400 }
      );
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
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "注册失败，请稍后再试" },
      { status: 500 }
    );
  }
}
