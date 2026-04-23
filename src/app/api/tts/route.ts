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
      // Check if it's likely a Legado config (has 'header' as string, 'url', 'name')
      // Legado headers are often JSON strings, we want to store them as objects if possible, 
      // but our schema defines headers as JSON (which Drizzle handles if we pass an object).
      // If it's a direct API match, we use it directly.
      
      let headers = item.headers;
      const method = item.method || "GET";
      const requestBody = item.body;

      // Legado mapping logic
      if (item.header && typeof item.header === 'string') {
          try {
              headers = JSON.parse(item.header);
          } catch {
              logger.warn("tts", "Failed to parse Legado header JSON", item.header);
              // If not valid JSON, maybe store as is or object? 
              // Our schema expects `json` mode, so `headers` should be an object.
              // If it's a simple string, we might just put it in a wrapper or ignore.
              headers = { "User-Agent": item.header }; // Fallback or assume it's just a UA string if parsing fails? 
              // Actually Legado headers are usually JSON.
          }
      }

      // Check for POST method in Legado usually implied by presence of body or specific flags? 
      // Actually Legado usually puts everything in URL or uses standard HTTP methods if specified. 
      // Often Legado URLs are just templates. 
      // For now, default to GET unless specified.

      return {
        id: uuidv4(),
        userId,
        name: item.name || "未命名配置",
        url: item.url,
        method: method,
        headers: headers,
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
