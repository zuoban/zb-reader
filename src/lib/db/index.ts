import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "db.sqlite");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let _sqlite: Database.Database | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

function getConnection() {
  if (_sqlite && _db) return { sqlite: _sqlite, db: _db };

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
      device_id TEXT NOT NULL DEFAULT 'legacy',
      device_name TEXT,
      progress REAL NOT NULL DEFAULT 0,
      location TEXT,
      current_page INTEGER,
      total_pages INTEGER,
      last_read_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
      UNIQUE(user_id, book_id, device_id)
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
      tts_engine TEXT NOT NULL DEFAULT 'browser' CHECK(tts_engine IN ('browser', 'legado')),
      browser_voice_id TEXT,
      tts_rate REAL NOT NULL DEFAULT 1,
      tts_pitch REAL NOT NULL DEFAULT 1,
      tts_volume REAL NOT NULL DEFAULT 1,
      microsoft_preload_count INTEGER NOT NULL DEFAULT 3,
      legado_rate INTEGER NOT NULL DEFAULT 50,
      legado_config_id TEXT,
      legado_preload_count INTEGER NOT NULL DEFAULT 3,
      tts_immersive_mode INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS progress_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      version INTEGER NOT NULL,
      progress REAL NOT NULL,
      location TEXT,
      scroll_ratio REAL,
      reading_duration INTEGER NOT NULL,
      device_id TEXT,
      device_name TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Migration: Add missing columns to reader_settings (2026-03-04)
  // These migrations are idempotent - they only run if columns don't exist
  try {
    sqlite.exec(`ALTER TABLE reader_settings ADD COLUMN tts_auto_next_chapter INTEGER NOT NULL DEFAULT 0;`);
  } catch {
    // Column already exists, ignore
  }
  try {
    sqlite.exec(`ALTER TABLE reader_settings ADD COLUMN tts_highlight_style TEXT NOT NULL DEFAULT 'indicator' CHECK(tts_highlight_style IN ('background', 'indicator'));`);
  } catch {
    // Column already exists, ignore
  }
  try {
    sqlite.exec(`ALTER TABLE reader_settings ADD COLUMN tts_highlight_color TEXT NOT NULL DEFAULT '#3b82f6';`);
  } catch {
    // Column already exists, ignore
  }
  try {
    sqlite.exec(`ALTER TABLE reader_settings ADD COLUMN auto_scroll_to_active INTEGER NOT NULL DEFAULT 1;`);
  } catch {
    // Column already exists, ignore
  }
  try {
    sqlite.exec(`ALTER TABLE reader_settings ADD COLUMN page_width INTEGER NOT NULL DEFAULT 800;`);
  } catch {
    // Column already exists, ignore
  }

  // Migration: Add device_id and device_name to reading_progress for multi-device sync (2026-03-04)
  // SQLite doesn't support modifying constraints, so we need to rebuild the table
  const progressInfo = sqlite.prepare("PRAGMA table_info(reading_progress)").all() as { name: string }[];
  const hasDeviceId = progressInfo.some((col) => col.name === "device_id");

  if (!hasDeviceId) {
    // Step 1: Add new columns
    sqlite.exec(`ALTER TABLE reading_progress ADD COLUMN device_id TEXT NOT NULL DEFAULT 'legacy';`);
    sqlite.exec(`ALTER TABLE reading_progress ADD COLUMN device_name TEXT;`);

    // Step 2: Rebuild table with new constraint
    sqlite.exec(`
      CREATE TABLE reading_progress_new (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
        device_id TEXT NOT NULL DEFAULT 'legacy',
        device_name TEXT,
        progress REAL NOT NULL DEFAULT 0,
        location TEXT,
        current_page INTEGER,
        total_pages INTEGER,
        last_read_at TEXT NOT NULL DEFAULT (datetime('now')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(user_id, book_id, device_id)
      );
    `);

    // Step 3: Copy data
    sqlite.exec(`
      INSERT INTO reading_progress_new 
      SELECT id, user_id, book_id, device_id, device_name, progress, location, 
             current_page, total_pages, last_read_at, created_at, updated_at
      FROM reading_progress;
    `);

    // Step 4: Replace old table
    sqlite.exec(`DROP TABLE reading_progress;`);
    sqlite.exec(`ALTER TABLE reading_progress_new RENAME TO reading_progress;`);
  }

  // Migration: Simplify reading_progress table (remove device fields, single progress record per book) (2026-03-05)
  const progressTableInfo = sqlite.prepare("PRAGMA table_info(reading_progress)").all() as { name: string }[];
  const hasDeviceIdInTable = progressTableInfo.some((col) => col.name === "device_id");

  // Check if the new constraint exists
  const indexInfo = sqlite.prepare("PRAGMA index_list(reading_progress)").all() as { name: string }[];
  const hasNewConstraint = indexInfo.some((idx) => idx.name === "reading_progress_user_book_unique");

  if (hasDeviceIdInTable && !hasNewConstraint) {
    // Step 1: Cleanup old backup and create new backup
    sqlite.exec(`DROP TABLE IF EXISTS reading_progress_backup;`);
    sqlite.exec(`
      CREATE TABLE reading_progress_backup AS
      SELECT * FROM reading_progress;
    `);

    // Step 2: Create new table (no device_id/device_name, new unique constraint)
    sqlite.exec(`
      CREATE TABLE reading_progress_new (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
        progress REAL NOT NULL DEFAULT 0,
        location TEXT,
        current_page INTEGER,
        total_pages INTEGER,
        last_read_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
        UNIQUE(user_id, book_id)
      );
    `);

    // Step 3: Merge data: keep only the latest record per user per book
    sqlite.exec(`
      INSERT INTO reading_progress_new (id, user_id, book_id, progress, location,
                                        current_page, total_pages, last_read_at,
                                        created_at, updated_at)
      SELECT
        id,
        user_id,
        book_id,
        progress,
        location,
        current_page,
        total_pages,
        last_read_at,
        created_at,
        updated_at
      FROM reading_progress_backup
      WHERE id IN (
        SELECT id FROM reading_progress_backup
        GROUP BY user_id, book_id
        HAVING updated_at = MAX(updated_at)
      );
    `);

    // Step 4: Replace table
    sqlite.exec(`DROP TABLE reading_progress;`);
    sqlite.exec(`ALTER TABLE reading_progress_new RENAME TO reading_progress;`);

    // Step 5: Cleanup
    sqlite.exec(`DROP TABLE IF EXISTS reading_progress_backup;`);
  }

  // Migration: Add missing columns to reading_progress (2026-03-09)
  const currentProgressInfo = sqlite.prepare("PRAGMA table_info(reading_progress)").all() as { name: string }[];
  const hasVersion = currentProgressInfo.some((col) => col.name === "version");
  const hasScrollRatio = currentProgressInfo.some((col) => col.name === "scroll_ratio");
  const hasReadingDuration = currentProgressInfo.some((col) => col.name === "reading_duration");
  const hasDeviceIdColumn = currentProgressInfo.some((col) => col.name === "device_id");

  if (!hasVersion) {
    sqlite.exec(`ALTER TABLE reading_progress ADD COLUMN version INTEGER DEFAULT 1;`);
  }
  if (!hasScrollRatio) {
    sqlite.exec(`ALTER TABLE reading_progress ADD COLUMN scroll_ratio REAL;`);
  }
  if (!hasReadingDuration) {
    sqlite.exec(`ALTER TABLE reading_progress ADD COLUMN reading_duration INTEGER DEFAULT 0;`);
  }
  if (!hasDeviceIdColumn) {
    sqlite.exec(`ALTER TABLE reading_progress ADD COLUMN device_id TEXT;`);
  }

  // Migration: Add font_family and flip_mode to reader_settings (2026-03-31)
  const readerSettingsInfo = sqlite.prepare("PRAGMA table_info(reader_settings)").all() as { name: string }[];
  const hasFontFamily = readerSettingsInfo.some((col) => col.name === "font_family");
  const hasFlipMode = readerSettingsInfo.some((col) => col.name === "flip_mode");

  if (!hasFontFamily) {
    sqlite.exec(`ALTER TABLE reader_settings ADD COLUMN font_family TEXT NOT NULL DEFAULT 'system';`);
  }
  if (!hasFlipMode) {
    sqlite.exec(`ALTER TABLE reader_settings ADD COLUMN flip_mode TEXT NOT NULL DEFAULT 'scroll';`);
  }

  // Migration: Add missing TTS and reader_settings columns (2026-04-23)
  const rsInfo = sqlite.prepare("PRAGMA table_info(reader_settings)").all() as { name: string }[];
  const missingColumns: Record<string, string> = {
    tts_engine: `TEXT NOT NULL DEFAULT 'browser'`,
    tts_pitch: `REAL NOT NULL DEFAULT 1`,
    tts_volume: `REAL NOT NULL DEFAULT 1`,
    legado_rate: `INTEGER NOT NULL DEFAULT 50`,
    legado_config_id: `TEXT`,
    legado_preload_count: `INTEGER NOT NULL DEFAULT 3`,
    tts_immersive_mode: `INTEGER NOT NULL DEFAULT 0`,
    tts_highlight_style: `TEXT NOT NULL DEFAULT 'indicator'`,
  };
  for (const [col, def] of Object.entries(missingColumns)) {
    if (!rsInfo.some((c) => c.name === col)) {
      sqlite.exec(`ALTER TABLE reader_settings ADD COLUMN ${col} ${def};`);
    }
  }

  // Migration: Add category support to books (2026-04-23)
  const booksInfo = sqlite.prepare("PRAGMA table_info(books)").all() as { name: string }[];
  const hasCategory = booksInfo.some((col) => col.name === "category");

  if (!hasCategory) {
    sqlite.exec(`ALTER TABLE books ADD COLUMN category TEXT;`);
  }

  // Migration: Add missing indexes for reading_progress (2026-03-31)
  sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_reading_progress_user_id ON reading_progress (user_id);`);
  sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_reading_progress_last_read_at ON reading_progress (last_read_at);`);
  sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_books_category ON books (category);`);

  _sqlite = sqlite;
  _db = drizzle(sqlite, { schema });

  return { sqlite: _sqlite, db: _db };
}

// Lazy-initialized exports
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
