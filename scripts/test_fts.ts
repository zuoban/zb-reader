/* eslint-disable no-console */

import Database from "better-sqlite3";

try {
  const db = new Database("data/db.sqlite");
  const stmt = db.prepare(`SELECT rowid, title FROM books_fts WHERE books_fts MATCH 'test*'`);
  const rows = stmt.all();
  console.log("FTS Match results:", rows);
} catch (e) {
  console.error("Query failed:", e);
}
