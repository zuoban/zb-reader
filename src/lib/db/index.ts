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

// Migration strategy:
// - CREATE TABLE IF NOT EXISTS handles fresh database initialization
// - drizzle-kit migrate handles future schema changes (run manually or in CI)
// - ensureReaderSettingsTtsEngineConstraint fixes legacy CHECK constraint

function ensureReaderSettingsTtsEngineConstraint(sqlite: Database.Database) {
  const row = sqlite
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'reader_settings'")
    .get() as { sql?: string } | undefined;
  const tableSql = row?.sql ?? "";

  if (!tableSql.includes("tts_engine") || tableSql.includes("'microsoft'")) {
    return;
  }

  const migrateConstraint = sqlite.transaction(() => {
    sqlite.exec(`
    DROP TABLE IF EXISTS reader_settings_new;

    CREATE TABLE reader_settings_new (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      font_size INTEGER NOT NULL DEFAULT 16,
      page_width INTEGER NOT NULL DEFAULT 800,
      theme TEXT NOT NULL DEFAULT 'light' CHECK(theme IN ('light', 'dark', 'sepia')),
      tts_engine TEXT NOT NULL DEFAULT 'browser' CHECK(tts_engine IN ('browser', 'legado', 'microsoft')),
      browser_voice_id TEXT,
      tts_rate REAL NOT NULL DEFAULT 1,
      tts_pitch REAL NOT NULL DEFAULT 1,
      tts_volume REAL NOT NULL DEFAULT 1,
      microsoft_preload_count INTEGER NOT NULL DEFAULT 3,
      tts_auto_next_chapter INTEGER NOT NULL DEFAULT 0,
      tts_highlight_color TEXT NOT NULL DEFAULT '#3b82f6',
      auto_scroll_to_active INTEGER NOT NULL DEFAULT 1,
      font_family TEXT NOT NULL DEFAULT 'system',
      flip_mode TEXT NOT NULL DEFAULT 'scroll',
      legado_rate INTEGER NOT NULL DEFAULT 50,
      legado_config_id TEXT,
      legado_preload_count INTEGER NOT NULL DEFAULT 3,
      tts_immersive_mode INTEGER NOT NULL DEFAULT 0,
      tts_highlight_style TEXT NOT NULL DEFAULT 'indicator' CHECK(tts_highlight_style IN ('background', 'indicator')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    INSERT INTO reader_settings_new (
      id,
      user_id,
      font_size,
      page_width,
      theme,
      tts_engine,
      browser_voice_id,
      tts_rate,
      tts_pitch,
      tts_volume,
      microsoft_preload_count,
      tts_auto_next_chapter,
      tts_highlight_color,
      auto_scroll_to_active,
      font_family,
      flip_mode,
      legado_rate,
      legado_config_id,
      legado_preload_count,
      tts_immersive_mode,
      tts_highlight_style,
      created_at,
      updated_at
    )
    SELECT
      id,
      user_id,
      font_size,
      page_width,
      theme,
      tts_engine,
      browser_voice_id,
      tts_rate,
      tts_pitch,
      tts_volume,
      microsoft_preload_count,
      tts_auto_next_chapter,
      tts_highlight_color,
      auto_scroll_to_active,
      font_family,
      flip_mode,
      legado_rate,
      legado_config_id,
      legado_preload_count,
      tts_immersive_mode,
      tts_highlight_style,
      created_at,
      updated_at
    FROM reader_settings;

    DROP TABLE reader_settings;
    ALTER TABLE reader_settings_new RENAME TO reader_settings;
  `);
  });

  migrateConstraint();
}

function getConnection() {
  if (_sqlite && _db) return { sqlite: _sqlite, db: _db };

  // Prevent concurrent initialization: if another call is
  // already initializing, block synchronously until it completes
  // In Node.js this is safe because JavaScript is single-threaded
  if (_initializing) {
    throw new Error("Database is still initializing");
  }
  _initializing = true;

  const sqlite = new Database(DB_PATH);

  // Enable WAL mode for better concurrent performance
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");

  // Auto-create tables if they don't exist
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      avatar TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      author TEXT DEFAULT '未知作者',
      cover TEXT,
      file_path TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      format TEXT NOT NULL CHECK(format IN ('epub')),
      description TEXT,
      isbn TEXT,
      publisher TEXT,
      publish_date TEXT,
      language TEXT,
      category TEXT,
      uploader_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reading_progress (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      progress REAL NOT NULL DEFAULT 0,
      furthest_progress REAL NOT NULL DEFAULT 0,
      location TEXT,
      last_read_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
      UNIQUE(user_id, book_id)
    );

    CREATE TABLE IF NOT EXISTS bookmarks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      location TEXT NOT NULL,
      label TEXT,
      page_number INTEGER,
      progress REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      location TEXT NOT NULL,
      selected_text TEXT,
      content TEXT,
      color TEXT DEFAULT 'yellow',
      page_number INTEGER,
      progress REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tts_configs (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      method TEXT NOT NULL DEFAULT 'GET',
      headers TEXT,
      body TEXT,
      content_type TEXT,
      concurrent_rate INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reader_settings (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      font_size INTEGER NOT NULL DEFAULT 16,
      page_width INTEGER NOT NULL DEFAULT 800,
      theme TEXT NOT NULL DEFAULT 'light' CHECK(theme IN ('light', 'dark', 'sepia')),
      tts_engine TEXT NOT NULL DEFAULT 'browser' CHECK(tts_engine IN ('browser', 'legado', 'microsoft')),
      browser_voice_id TEXT,
      tts_rate REAL NOT NULL DEFAULT 1,
      tts_pitch REAL NOT NULL DEFAULT 1,
      tts_volume REAL NOT NULL DEFAULT 1,
      microsoft_preload_count INTEGER NOT NULL DEFAULT 3,
      tts_auto_next_chapter INTEGER NOT NULL DEFAULT 0,
      tts_highlight_color TEXT NOT NULL DEFAULT '#3b82f6',
      auto_scroll_to_active INTEGER NOT NULL DEFAULT 1,
      font_family TEXT NOT NULL DEFAULT 'system',
      flip_mode TEXT NOT NULL DEFAULT 'scroll',
      legado_rate INTEGER NOT NULL DEFAULT 50,
      legado_config_id TEXT,
      legado_preload_count INTEGER NOT NULL DEFAULT 3,
      tts_immersive_mode INTEGER NOT NULL DEFAULT 0,
      tts_highlight_style TEXT NOT NULL DEFAULT 'indicator' CHECK(tts_highlight_style IN ('background', 'indicator')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Legacy migration: Fix tts_engine CHECK constraint on reader_settings
  // (Needed for databases created before 'microsoft' was added as a valid engine)
  ensureReaderSettingsTtsEngineConstraint(sqlite);

  // Legacy migration: Rebuild reading_progress table if it still has device_id/device_name columns
  const progressTableInfo = sqlite.prepare("PRAGMA table_info(reading_progress)").all() as { name: string }[];
  const hasLegacyDeviceColumns = progressTableInfo.some(
    (col) => col.name === "device_id" || col.name === "device_name"
  );

  if (hasLegacyDeviceColumns) {
    sqlite.exec(`
      CREATE TABLE reading_progress_new (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
        progress REAL NOT NULL DEFAULT 0,
        furthest_progress REAL NOT NULL DEFAULT 0,
        location TEXT,
        last_read_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
        UNIQUE(user_id, book_id)
      );

      INSERT INTO reading_progress_new (id, user_id, book_id, progress, furthest_progress, location,
                                        last_read_at, created_at, updated_at)
      SELECT id, user_id, book_id, progress, COALESCE(progress, 0), location,
             last_read_at, created_at, updated_at
      FROM reading_progress;

      DROP TABLE reading_progress;
      ALTER TABLE reading_progress_new RENAME TO reading_progress;
    `);
  }

  // Indexes (idempotent via IF NOT EXISTS)
  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS idx_reading_progress_user_id ON reading_progress (user_id);
    CREATE INDEX IF NOT EXISTS idx_reading_progress_last_read_at ON reading_progress (last_read_at);
    CREATE INDEX IF NOT EXISTS idx_books_category ON books (category);
    CREATE INDEX IF NOT EXISTS idx_books_uploader_id ON books (uploader_id);
    CREATE INDEX IF NOT EXISTS idx_bookmarks_user_book ON bookmarks (user_id, book_id);
    CREATE INDEX IF NOT EXISTS idx_bookmarks_book_id ON bookmarks (book_id);
    CREATE INDEX IF NOT EXISTS idx_notes_user_book ON notes (user_id, book_id);
    CREATE INDEX IF NOT EXISTS idx_notes_book_id ON notes (book_id);
    CREATE INDEX IF NOT EXISTS idx_tts_configs_user_id ON tts_configs (user_id);
  `);

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
