import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { unauthorized, notFound, badRequest, serverError } from "@/lib/api-utils";

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorized();
  }

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    });

    if (!user) {
      return notFound("用户不存在");
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
    logger.error("api", "获取用户信息失败:", error);
    return serverError("获取用户信息失败");
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorized();
  }

  try {
    const { username, email, password, avatar } = await req.json();

    const updates: Record<string, unknown> = {
      updatedAt: sql`(datetime('now'))`,
    };

    if (username !== undefined) {
      if (username.length < 2 || username.length > 20) {
        return badRequest("用户名长度应在 2-20 个字符之间");
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
        return badRequest("邮箱格式不正确");
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
        return badRequest("密码长度至少 6 个字符");
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
      return notFound("用户不存在");
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
    logger.error("api", "更新用户信息失败:", error);
    return serverError("更新用户信息失败");
  }
}
