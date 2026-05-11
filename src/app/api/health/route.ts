import { NextResponse } from "next/server";
import { db, getSqlite } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET() {
  const startTime = Date.now();
  const checks: Record<string, string> = {};

  // Check database connection
  try {
    const sqlite = getSqlite();
    const row = sqlite.prepare("SELECT 1 as ok").get() as { ok: number };
    if (row.ok === 1) {
      checks.database = "ok";
    } else {
      checks.database = "degraded";
    }
  } catch (error) {
    checks.database = "error";
    logger.error("health", "Database check failed", error);
  }

  const uptime = Date.now() - startTime;

  return NextResponse.json({
    status: Object.values(checks).every(v => v === "ok") ? "healthy" : "degraded",
    version: process.env.npm_package_version ?? "dev",
    uptime: `${uptime}ms`,
    checks,
  });
}
