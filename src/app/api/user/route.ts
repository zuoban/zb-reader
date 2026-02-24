import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    });

    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    const avatarUrl = user.avatar ? `/api/user/avatar/${user.id}` : null;

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: avatarUrl,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("获取用户信息失败:", error);
    return NextResponse.json({ error: "获取用户信息失败" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const { username, email, password, avatar } = await req.json();

    const updates: Record<string, any> = {
      updatedAt: sql`(datetime('now'))`,
    };

    if (username !== undefined) {
      if (username.length < 2 || username.length > 20) {
        return NextResponse.json(
          { error: "用户名长度应在 2-20 个字符之间" },
          { status: 400 }
        );
      }

      const existingUser = await db.query.users.findFirst({
        where: eq(users.username, username),
      });

      if (existingUser && existingUser.id !== session.user.id) {
        return NextResponse.json(
          { error: "用户名已被使用" },
          { status: 409 }
        );
      }

      updates.username = username;
    }

    if (email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: "邮箱格式不正确" },
          { status: 400 }
        );
      }

      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, email),
      });

      if (existingUser && existingUser.id !== session.user.id) {
        return NextResponse.json(
          { error: "邮箱已被使用" },
          { status: 409 }
        );
      }

      updates.email = email;
    }

    if (password !== undefined) {
      if (password.length < 6) {
        return NextResponse.json(
          { error: "密码长度至少 6 个字符" },
          { status: 400 }
        );
      }

      updates.password = await bcrypt.hash(password, 12);
    }

    if (avatar !== undefined) {
      updates.avatar = avatar;
    }

    await db
      .update(users)
      .set(updates)
      .where(eq(users.id, session.user.id));

    const updatedUser = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    });

    if (!updatedUser) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    return NextResponse.json({
      message: "更新成功",
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        avatar: updatedUser.avatar ? `/api/user/avatar/${updatedUser.id}` : null,
      },
    });
  } catch (error) {
    console.error("更新用户信息失败:", error);
    return NextResponse.json({ error: "更新用户信息失败" }, { status: 500 });
  }
}
