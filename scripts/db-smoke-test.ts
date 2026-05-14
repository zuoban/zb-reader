/* eslint-disable no-console */
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

/**
 * Database Smoke Test
 * 
 * This test verifies that:
 * 1. A fresh database can be created from scratch.
 * 2. All migrations in the drizzle/ directory can be applied successfully in order.
 * 3. The resulting schema matches the critical expectations of the application.
 */

async function runSmokeTest() {
  console.log("🚀 Starting Database Smoke Test...");
  
  // Use an in-memory database for testing
  const db = new Database(":memory:");
  console.log("✅ In-memory database created.");

  const migrationsDir = path.join(process.cwd(), "drizzle");
  const journalPath = path.join(migrationsDir, "meta/_journal.json");

  if (!fs.existsSync(journalPath)) {
    console.error("❌ Migration journal not found at:", journalPath);
    process.exit(1);
  }

  const journal = JSON.parse(fs.readFileSync(journalPath, "utf-8"));
  const entries = journal.entries;

  console.log(`Found ${entries.length} migration entries.`);

  // Apply migrations in order
  for (const entry of entries) {
    const migrationFile = `${entry.tag}.sql`;
    const migrationPath = path.join(migrationsDir, migrationFile);
    
    if (!fs.existsSync(migrationPath)) {
      console.error(`❌ Migration file not found: ${migrationPath}`);
      process.exit(1);
    }

    console.log(`Applying migration: ${entry.tag}...`);
    const sql = fs.readFileSync(migrationPath, "utf-8");
    
    try {
      // Split by ';' and execute each statement if needed, 
      // but better-sqlite3 exec() can handle multiple statements.
      db.exec(sql);
      console.log(`✅ ${entry.tag} applied.`);
    } catch (error: any) {
      console.error(`❌ Failed to apply ${entry.tag}:`, error.message);
      process.exit(1);
    }
  }

  console.log("\nVerifying final schema...");

  // Verify critical tables
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[];
  const tableNames = tables.map(t => t.name);
  const expectedTables = ["users", "books", "reading_progress", "bookmarks", "notes", "tts_configs", "reader_settings", "books_fts"];
  
  for (const table of expectedTables) {
    if (tableNames.includes(table)) {
      console.log(`✅ Table '${table}' exists.`);
    } else {
      console.error(`❌ Table '${table}' is missing!`);
      process.exit(1);
    }
  }

  // Verify FTS table specifically
  try {
    const ftsInfo = db.prepare("SELECT sql FROM sqlite_master WHERE name = 'books_fts'").get() as { sql: string };
    if (ftsInfo.sql.includes("tokenize='trigram'")) {
      console.log("✅ FTS table 'books_fts' uses trigram tokenizer.");
    } else {
      console.error("❌ FTS table 'books_fts' does NOT use trigram tokenizer!");
      process.exit(1);
    }
  } catch (error: any) {
    console.error("❌ Failed to verify FTS table:", error.message);
    process.exit(1);
  }

  // Verify FTS triggers
  const triggers = db.prepare("SELECT name FROM sqlite_master WHERE type='trigger'").all() as { name: string }[];
  const triggerNames = triggers.map(t => t.name);
  const expectedTriggers = ["books_ai", "books_ad", "books_au"];
  
  for (const trigger of expectedTriggers) {
    if (triggerNames.includes(trigger)) {
      console.log(`✅ Trigger '${trigger}' exists.`);
    } else {
      console.error(`❌ Trigger '${trigger}' is missing!`);
      process.exit(1);
    }
  }

  console.log("\n✨ Database Smoke Test PASSED successfully!");
  db.close();
}

runSmokeTest().catch(err => {
  console.error("💥 Smoke test failed with fatal error:", err);
  process.exit(1);
});
