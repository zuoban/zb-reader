import Database from "better-sqlite3";
import { join } from "path";

const dbPath = join(process.cwd(), "data", "db.sqlite");
const db = new Database(dbPath);

function log(message: string) {
  process.stdout.write(`${message}\n`);
}

function logError(message: string, error: unknown) {
  const detail =
    error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`${message} ${detail}\n`);
}

log("Running progress sync migration...");

try {
  // Check if columns already exist
  const tableInfo = db
    .prepare("PRAGMA table_info(reading_progress)")
    .all() as Array<{ name: string }>;
  const columnNames = tableInfo.map((col) => col.name);

  // Add new columns to reading_progress if they don't exist
  if (!columnNames.includes("version")) {
    log("Adding version column...");
    db.exec(
      "ALTER TABLE reading_progress ADD COLUMN version INTEGER DEFAULT 1 NOT NULL"
    );
  }

  if (!columnNames.includes("scroll_ratio")) {
    log("Adding scroll_ratio column...");
    db.exec("ALTER TABLE reading_progress ADD COLUMN scroll_ratio REAL");
  }

  if (!columnNames.includes("reading_duration")) {
    log("Adding reading_duration column...");
    db.exec(
      "ALTER TABLE reading_progress ADD COLUMN reading_duration INTEGER DEFAULT 0 NOT NULL"
    );
  }

  if (!columnNames.includes("device_id")) {
    log("Adding device_id column...");
    db.exec("ALTER TABLE reading_progress ADD COLUMN device_id TEXT");
  }

  // Create progress_history table
  log("Creating progress_history table...");
  db.exec(`
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
      created_at TEXT DEFAULT (datetime('now')) NOT NULL
    )
  `);

  // Create index on progress_history
  log("Creating index on progress_history...");
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_progress_history_user_book_time 
    ON progress_history(user_id, book_id, created_at DESC)
  `);

  log("Migration completed successfully!");
} catch (error) {
  logError("Migration failed:", error);
  process.exit(1);
} finally {
  db.close();
}
