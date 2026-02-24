import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import path from "path";
import fs from "fs";

const DATA_DIR = path.join(process.cwd(), "data");
const AVATAR_DIR = path.join(DATA_DIR, "avatars");

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { userId } = await params;

  if (userId !== session.user.id) {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  try {
    const exts = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
    let avatarPath = null;

    for (const ext of exts) {
      const filePath = path.join(AVATAR_DIR, `${userId}${ext}`);
      if (fs.existsSync(filePath)) {
        avatarPath = filePath;
        const contentType = `image/${ext.slice(1)}`;
        const buffer = fs.readFileSync(filePath);

        return new NextResponse(buffer, {
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "private, max-age=31536000, immutable",
          },
        });
      }
    }

    return NextResponse.json({ error: "头像不存在" }, { status: 404 });
  } catch (error) {
    console.error("获取头像失败:", error);
    return NextResponse.json({ error: "获取头像失败" }, { status: 500 });
  }
}
