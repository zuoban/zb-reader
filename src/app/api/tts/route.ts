import { NextRequest, NextResponse } from "next/server";
import { desc, eq, isNull, or } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { db } from "@/lib/db";
import { ttsConfigs } from "@/lib/db/schema";
import { badRequest, getAuthUserId, serverError, validateJson } from "@/lib/api-utils";
import { logger } from "@/lib/logger";
import { ttsConfigImportSchema } from "@/lib/validations";

interface TtsImportItem {
  name?: string;
  url?: string;
  method?: string;
  headers?: unknown;
  header?: string;
  body?: unknown;
  contentType?: string;
  concurrentRate?: string | number;
}

interface ValidTtsImportItem extends TtsImportItem {
  name: string;
  url: string;
}

export async function GET() {
  const authResult = await getAuthUserId();
  if (authResult.error) return authResult.error;
  const { userId } = authResult;

  try {
    const configs = await db
      .select()
      .from(ttsConfigs)
      .where(or(eq(ttsConfigs.userId, userId), isNull(ttsConfigs.userId)))
      .orderBy(desc(ttsConfigs.createdAt));
    return NextResponse.json(configs);
  } catch (error) {
    logger.error("api", "Failed to fetch TTS configs:", error);
    return serverError("获取TTS配置失败");
  }
}

export async function POST(req: NextRequest) {
  const authResult = await getAuthUserId();
  if (authResult.error) return authResult.error;
  const { userId } = authResult;

  try {
    const validation = await validateJson(req, ttsConfigImportSchema);
    if (validation.error) return validation.error;
    const body = validation.data;
    const configsToInsert: (typeof ttsConfigs.$inferInsert)[] = [];

    const processItem = (item: ValidTtsImportItem) => {
      let headers = item.headers;
      const method = item.method || "GET";
      const requestBody = item.body;

      // Legado compatibility: convert string header to object
      if (typeof item.header === "string" && item.header.length > 0) {
        try {
          headers = JSON.parse(item.header);
        } catch {
          logger.warn("tts", "无法解析 Legado header，使用默认 User-Agent", item.header);
          headers = { "User-Agent": item.header };
        }
      }

      return {
        id: uuidv4(),
        userId,
        name: item.name || "未命名配置",
        url: item.url,
        method,
        headers,
        body: requestBody,
        contentType: item.contentType,
        concurrentRate: item.concurrentRate ? Number(item.concurrentRate) : 0,
      };
    };

    if (Array.isArray(body)) {
      body.forEach((item) => {
        const normalizedItem = item as TtsImportItem;
        if (normalizedItem.url && normalizedItem.name) {
             configsToInsert.push(processItem(normalizedItem as ValidTtsImportItem));
        }
      });
    } else if (body.url && body.name) {
      configsToInsert.push(processItem(body as ValidTtsImportItem));
    } else {
        return badRequest("无效的配置格式");
    }

    if (configsToInsert.length > 0) {
      await db.insert(ttsConfigs).values(configsToInsert);
    }

    return NextResponse.json({ 
        message: `成功导入 ${configsToInsert.length} 个配置`, 
        count: configsToInsert.length 
    });

  } catch (error) {
    logger.error("api", "Failed to create TTS config:", error);
    return serverError("创建TTS配置失败");
  }
}
