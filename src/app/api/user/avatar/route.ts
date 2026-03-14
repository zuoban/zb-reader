import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { sql } from "drizzle-orm";
import { unauthorized, badRequest, serverError } from "@/lib/api-utils";

const DATA_DIR = path.join(process.cwd(), "data");
const AVATAR_DIR = path.join(DATA_DIR, "avatars");

// 允许的图片格式白名单
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
// 允许的 MIME 类型
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// 图片魔数（文件头）验证
const IMAGE_SIGNATURES: Record<string, number[]> = {
  jpeg: [0xff, 0xd8, 0xff],
  png: [0x89, 0x50, 0x4e, 0x47],
  webp: [0x52, 0x49, 0x46, 0x46],
  gif: [0x47, 0x49, 0x46, 0x38],
};

function validateImageMagicNumber(buffer: Buffer): string | null {
  // 检查文件头是否符合图片格式
  for (const [type, signature] of Object.entries(IMAGE_SIGNATURES)) {
    if (signature.length <= buffer.length) {
      const match = signature.every((byte, i) => buffer[i] === byte);
      if (match) {
        return type;
      }
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorized();
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return badRequest("未上传文件");
    }

    // 检查 MIME 类型
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return badRequest("只支持 JPG、PNG、WebP、GIF 格式的图片");
    }

    // 检查文件大小
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      return badRequest("图片大小不能超过 2MB");
    }

    // 检查文件大小不为 0
    if (file.size === 0) {
      return badRequest("文件不能为空");
    }

    await mkdir(AVATAR_DIR, { recursive: true });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 验证文件魔数（防止伪造文件类型）
    const detectedType = validateImageMagicNumber(buffer);
    if (!detectedType) {
      return badRequest("无效的图片文件");
    }

    // 验证扩展名是否匹配
    const ext = path.extname(file.name).toLowerCase().slice(1);
    if (ext !== detectedType) {
      // 允许 jpg 和 jpeg 互相转换
      if (!(ext === "jpg" && detectedType === "jpeg") && !(ext === "jpeg" && detectedType === "jpg")) {
        logger.warn("avatar", "文件扩展名与内容不匹配", { ext, detectedType });
        return badRequest("文件扩展名与内容不匹配");
      }
    }

    // 使用检测到的类型作为扩展名
    const fileExt = detectedType === "jpeg" ? "jpg" : detectedType;
    const filename = `${session.user.id}.${fileExt}`;
    const filepath = path.join(AVATAR_DIR, filename);

    await writeFile(filepath, buffer);

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
    logger.error("api", "头像上传失败:", error);
    return serverError("头像上传失败");
  }
}
