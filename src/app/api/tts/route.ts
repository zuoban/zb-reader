import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ttsConfigs } from "@/lib/db/schema";
import { v4 as uuidv4 } from "uuid";
import { desc } from "drizzle-orm";

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
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const configs = await db
      .select()
      .from(ttsConfigs)
      .orderBy(desc(ttsConfigs.createdAt));
    return NextResponse.json(configs);
  } catch (error) {
    console.error("Failed to fetch TTS configs:", error);
    return NextResponse.json({ error: "获取TTS配置失败" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const body = await req.json();
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
              console.warn("Failed to parse Legado header JSON", item.header);
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
        return NextResponse.json({ error: "无效的配置格式" }, { status: 400 });
    }

    if (configsToInsert.length > 0) {
      await db.insert(ttsConfigs).values(configsToInsert);
    }

    return NextResponse.json({ 
        message: `成功导入 ${configsToInsert.length} 个配置`, 
        count: configsToInsert.length 
    });

  } catch (error) {
    console.error("Failed to create TTS config:", error);
    return NextResponse.json({ error: "创建TTS配置失败" }, { status: 500 });
  }
}
