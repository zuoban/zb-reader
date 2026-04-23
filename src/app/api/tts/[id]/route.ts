import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { ttsConfigs } from "@/lib/db/schema";
import { getAuthUserId, notFound, serverError, validateJson } from "@/lib/api-utils";
import { logger } from "@/lib/logger";
import { ttsConfigUpdateSchema } from "@/lib/validations";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await getAuthUserId();
  if (authResult.error) return authResult.error;
  const { userId } = authResult;

  try {
    const { id } = await params;
    const validation = await validateJson(req, ttsConfigUpdateSchema);
    if (validation.error) return validation.error;
    const body = validation.data;

    // Validate if exists
    const existing = await db
      .select()
      .from(ttsConfigs)
      .where(
        and(
          eq(ttsConfigs.id, id),
          or(eq(ttsConfigs.userId, userId), isNull(ttsConfigs.userId))
        )
      )
      .get();

    if (!existing) {
      return notFound("配置不存在");
    }

    await db
      .update(ttsConfigs)
      .set({
        name: body.name,
        url: body.url,
        method: body.method,
        headers: body.headers,
        body: body.body,
        contentType: body.contentType,
        concurrentRate: body.concurrentRate,
        userId: existing.userId ?? userId,
        updatedAt: new Date().toISOString().replace("T", " ").split(".")[0], // Simple SQLite datetime
      })
      .where(eq(ttsConfigs.id, id));

    return NextResponse.json({ message: "更新成功" });
  } catch (error) {
    logger.error("api", "Failed to update TTS config:", error);
    return serverError("更新TTS配置失败");
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await getAuthUserId();
  if (authResult.error) return authResult.error;
  const { userId } = authResult;

  try {
    const { id } = await params;
    const existing = await db
      .select({ id: ttsConfigs.id })
      .from(ttsConfigs)
      .where(and(eq(ttsConfigs.id, id), eq(ttsConfigs.userId, userId)))
      .get();

    if (!existing) {
      return notFound("配置不存在");
    }

    await db
      .delete(ttsConfigs)
      .where(
        and(
          eq(ttsConfigs.id, id),
          eq(ttsConfigs.userId, userId)
        )
      );

    return NextResponse.json({ message: "删除成功" });
  } catch (error) {
    logger.error("api", "Failed to delete TTS config:", error);
    return serverError("删除TTS配置失败");
  }
}
