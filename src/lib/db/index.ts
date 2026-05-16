import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

const DATA_DIR = path.join(/*turbopackIgnore: true*/ process.cwd(), "data");
const DB_PATH = path.join(/*turbopackIgnore: true*/ process.cwd(), "data/db.sqlite");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Global persistence for HMR in development
declare global {
  var _sqlite: Database.Database | undefined;
  var _db: ReturnType<typeof drizzle<typeof schema>> | undefined;
}

let _initializing = false;

function getConnection() {
  if (globalThis._sqlite && globalThis._db) {
    return { sqlite: globalThis._sqlite, db: globalThis._db };
  }

  if (_initializing) {
    throw new Error("Database is still initializing");
  }
  _initializing = true;

  try {
    const sqlite = new Database(DB_PATH);

    // Enable WAL mode for better concurrent performance
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
    sqlite.pragma("busy_timeout = 5000");
    sqlite.pragma("cache_size = -2000"); // 2MB cache
    sqlite.pragma("temp_store = MEMORY");
    sqlite.pragma("synchronous = NORMAL");

    const dbInstance = drizzle(sqlite, { schema });

    // Cache connection on globalThis to survive HMR in development
    // In production, module-level singleton would suffice, but globalThis ensures consistency
    globalThis._sqlite ??= sqlite;
    globalThis._db ??= dbInstance;

    return { sqlite, db: dbInstance };
  } finally {
    _initializing = false;
  }
}

// Lazy-initialized exports with initialization guard
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    const { db } = getConnection();
    return (db as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export function getDb() {
  return getConnection().db;
}

export function getSqlite() {
  return getConnection().sqlite;
}
