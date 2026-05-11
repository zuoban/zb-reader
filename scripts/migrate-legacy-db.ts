/**
 * Legacy database migration script
 * Run this once if you have an existing database created before drizzle-kit was used.
 *
 * Usage: npx tsx scripts/migrate-legacy-db.ts
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(process.cwd(), "data/db.sqlite");

if (!fs.existsSync(DATA_DIR)) {
  console.log("No data directory found. Nothing to migrate.");
  process.exit(0);
}

if (!fs.existsSync(DB_PATH)) {
  console.log("No database file found. Nothing to migrate.");
  process.exit(0);
}

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

console.log("Checking legacy tables...");

// Check if reader_settings needs tts_engine constraint fix
const row = db
  .prepare(
    "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'reader_settings'"
  )
  .get() as { sql?: string } | undefined;

const tableSql = row?.sql ?? "";
if (tableSql.includes("tts_engine") && !tableSql.includes("'microsoft'")) {
  console.log("Migrating reader_settings table...");
  db.exec(`
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

    INSERT INTO reader_settings_new SELECT * FROM reader_settings;
    DROP TABLE reader_settings;
    ALTER TABLE reader_settings_new RENAME TO reader_settings;
  `);
  console.log("reader_settings table migrated successfully.");
}

// Check if reading_progress has legacy device columns
const progressColumns = db
  .prepare("PRAGMA table_info(reading_progress)")
  .all() as { name: string }[];

const hasLegacyColumns = progressColumns.some(
  (col) => col.name === "device_id" || col.name === "device_name"
);

if (hasLegacyColumns) {
  console.log("Migrating reading_progress table...");
  db.exec(`
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
  console.log("reading_progress table migrated successfully.");
}

// Ensure indexes exist
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_reading_progress_user_id ON reading_progress (user_id);
  CREATE INDEX IF NOT EXISTS idx_reading_progress_last_read_at ON reading_progress (last_read_at);
  CREATE INDEX IF NOT EXISTS idx_books_category ON books (category);
  CREATE INDEX IF NOT EXISTS idx_books_uploader_id ON books (uploader_id);
  CREATE INDEX IF NOT EXISTS idx_bookmarks_user_book ON bookmarks (user_id, book_id);
  CREATE INDEX IF NOT EXISTS idx_bookmarks_book_id ON bookmarks (book_id);
  CREATE INDEX IF NOT EXISTS idx_notes_user_book ON notes (user_id, book_id);
  CREATE INDEX IF NOT EXISTS idx_notes_book_id ON notes (book_id);
  CREATE INDEX IF NOT EXISTS idx_tts_configs_user_id ON tts_configs (user_id);
  CREATE UNIQUE INDEX IF NOT EXISTS uq_bookmarks_user_book_location
    ON bookmarks (user_id, book_id, location);
  CREATE UNIQUE INDEX IF NOT EXISTS uq_notes_user_book_location
    ON notes (user_id, book_id, location);
`);

db.close();
console.log("All migrations completed successfully.");
