import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { getAuthUserId, notFound, serverError, validateJson } from "@/lib/api-utils";
import { userUpdateSchema } from "@/lib/validations";

export async function GET(_req: NextRequest) {
  const authResult = await getAuthUserId();
  if (authResult.error) return authResult.error;

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, authResult.userId),
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
  const authResult = await getAuthUserId();
  if (authResult.error) return authResult.error;

  try {
    const validation = await validateJson(req, userUpdateSchema);
    if (validation.error) return validation.error;
    const { username, email, password, avatar } = validation.data;

    const updates: Record<string, unknown> = {
      updatedAt: sql`(datetime('now'))`,
    };

    if (username !== undefined) {
      const existingUser = await db.query.users.findFirst({
        where: eq(users.username, username),
      });

      if (existingUser && existingUser.id !== authResult.userId) {
        return NextResponse.json(
          { error: "用户名已被使用" },
          { status: 409 }
        );
      }

      updates.username = username;
    }

    if (email !== undefined) {
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, email),
      });

      if (existingUser && existingUser.id !== authResult.userId) {
        return NextResponse.json(
          { error: "邮箱已被使用" },
          { status: 409 }
        );
      }

      updates.email = email;
    }

    if (password !== undefined) {
      updates.password = await bcrypt.hash(password, 12);
    }

    if (avatar !== undefined) {
      updates.avatar = avatar;
    }

    await db
      .update(users)
      .set(updates)
      .where(eq(users.id, authResult.userId));

    const updatedUser = await db.query.users.findFirst({
      where: eq(users.id, authResult.userId),
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
