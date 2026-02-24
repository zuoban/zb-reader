import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { sql } from "drizzle-orm";

const DATA_DIR = path.join(process.cwd(), "data");
const AVATAR_DIR = path.join(DATA_DIR, "avatars");

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "未上传文件" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "只支持图片文件" }, { status: 400 });
    }

    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "图片大小不能超过 2MB" },
        { status: 400 }
      );
    }

    await mkdir(AVATAR_DIR, { recursive: true });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = path.extname(file.name);
    const filename = `${session.user.id}${ext}`;
    const filepath = path.join(AVATAR_DIR, filename);

    await writeFile(filepath, buffer);

    const avatarPath = `/data/avatars/${filename}`;

    await db
      .update(users)
      .set({ 
        avatar: `/api/user/avatar/${session.user.id}`,
        updatedAt: sql`(datetime('now'))`,
      })
      .where(eq(users.id, session.user.id));

    return NextResponse.json({
      message: "头像上传成功",
      avatar: `/api/user/avatar/${session.user.id}`,
    });
  } catch (error) {
    console.error("头像上传失败:", error);
    return NextResponse.json({ error: "头像上传失败" }, { status: 500 });
  }
}
