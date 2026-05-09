import { NextRequest, NextResponse } from "next/server";
import { notFound, serverError, validateJson, getAuthUserId } from "@/lib/api-utils";
import { logger } from "@/lib/logger";
import { syncReadingProgressItem } from "@/lib/progress-sync-service";
import { progressSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  const authResult = await getAuthUserId();
  if (authResult.error) return authResult.error;
  const { userId } = authResult;

  try {
    const parsed = await validateJson(req, progressSchema);
    if (parsed.error) {
      return parsed.error;
    }

    logger.debug("api", "[Progress Sync] Request", {
      userId,
      bookId: parsed.data.bookId,
    });

    const status = await syncReadingProgressItem(userId, parsed.data);
    if (status === "not_found") {
      return notFound("书籍不存在");
    }

    return NextResponse.json({
      status,
    });
  } catch (error) {
    logger.error("api", "[Progress Sync] Error:", error);
    return serverError("同步失败");
  }
}
