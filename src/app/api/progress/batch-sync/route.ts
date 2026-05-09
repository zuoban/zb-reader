import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { serverError, validateJson, getAuthUserId } from "@/lib/api-utils";
import { logger } from "@/lib/logger";
import { syncReadingProgressItem } from "@/lib/progress-sync-service";
import { progressSchema } from "@/lib/validations";

const batchProgressSchema = z.array(progressSchema);

export async function POST(req: NextRequest) {
  const authResult = await getAuthUserId();
  if (authResult.error) return authResult.error;
  const { userId } = authResult;

  try {
    const parsed = await validateJson(req, batchProgressSchema);
    if (parsed.error) {
      return parsed.error;
    }

    const items = parsed.data;
    const results = [];

    for (const item of items) {
      const status = await syncReadingProgressItem(userId, item);
      results.push(
        status === "not_found"
          ? { bookId: item.bookId, status: "error", error: "书籍不存在" }
          : { bookId: item.bookId, status }
      );
    }

    return NextResponse.json({ results });
  } catch (error) {
    logger.error("api", "[Progress Batch Sync] Error:", error);
    return serverError("批量同步失败");
  }
}
