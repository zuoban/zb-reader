import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import path from "path";
import fs from "fs";
import { unauthorized, forbidden, notFound, serverError } from "@/lib/api-utils";

const DATA_DIR = path.join(process.cwd(), "data");
const AVATAR_DIR = path.join(DATA_DIR, "avatars");

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorized();
  }

  const { userId } = await params;

  if (userId !== session.user.id) {
    return forbidden();
  }

  try {
    const exts = [".jpg", ".jpeg", ".png", ".gif", ".webp"];

    for (const ext of exts) {
      const filePath = path.join(AVATAR_DIR, `${userId}${ext}`);
      if (fs.existsSync(filePath)) {
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

    return notFound("头像不存在");
  } catch (error) {
    logger.error("api", "获取头像失败:", error);
    return serverError("获取头像失败");
  }
}
