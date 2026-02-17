import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ttsConfigs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();

    // Validate if exists
    const existing = await db
      .select()
      .from(ttsConfigs)
      .where(eq(ttsConfigs.id, id))
      .get();

    if (!existing) {
      return NextResponse.json({ error: "配置不存在" }, { status: 404 });
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
        updatedAt: new Date().toISOString().replace("T", " ").split(".")[0], // Simple SQLite datetime
      })
      .where(eq(ttsConfigs.id, id));

    return NextResponse.json({ message: "更新成功" });
  } catch (error) {
    console.error("Failed to update TTS config:", error);
    return NextResponse.json({ error: "更新TTS配置失败" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const { id } = await params;

    await db.delete(ttsConfigs).where(eq(ttsConfigs.id, id));

    return NextResponse.json({ message: "删除成功" });
  } catch (error) {
    console.error("Failed to delete TTS config:", error);
    return NextResponse.json({ error: "删除TTS配置失败" }, { status: 500 });
  }
}
