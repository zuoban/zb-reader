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

let _sqlite: Database.Database | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _initializing = false;

// Database initialization:
// - Tables are created via drizzle-kit migrate (see drizzle.config.ts)
// - For fresh installs, run: npx drizzle-kit generate && npx drizzle-kit migrate
// - Legacy migration for old databases: see scripts/migrate-legacy-db.ts



function getConnection() {
  if (_sqlite && _db) return { sqlite: _sqlite, db: _db };

  if (_initializing) {
    throw new Error("Database is still initializing");
  }
  _initializing = true;

  const sqlite = new Database(DB_PATH);

  // Enable WAL mode for better concurrent performance
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  sqlite.pragma("cache_size = -2000"); // 2MB cache
  sqlite.pragma("temp_store = MEMORY");
  sqlite.pragma("synchronous = NORMAL");

  _sqlite = sqlite;
  _db = drizzle(sqlite, { schema });
  _initializing = false;

  return { sqlite: _sqlite, db: _db };
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
