/* eslint-disable no-console */

import Database from "better-sqlite3";
import fs from "fs";

try {
  const db = new Database("data/db.sqlite");
  const sql = fs.readFileSync("drizzle/0011_add_books_fts.sql", "utf-8");
  db.exec(sql);
  console.log("Migration applied successfully!");
} catch (e) {
  console.error("Migration failed:", e);
}
