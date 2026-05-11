/* eslint-disable no-console */

import Database from "better-sqlite3";

try {
  const db = new Database("data/db.sqlite");
  db.exec("DROP TABLE IF EXISTS books_fts;");
  db.exec(`
CREATE VIRTUAL TABLE IF NOT EXISTS books_fts USING fts5(
  title, 
  author,
  content='books', 
  content_rowid='rowid',
  tokenize='trigram'
);

-- Triggers
CREATE TRIGGER IF NOT EXISTS books_ai AFTER INSERT ON books BEGIN
  INSERT INTO books_fts(rowid, title, author) VALUES (new.rowid, new.title, new.author);
END;

CREATE TRIGGER IF NOT EXISTS books_ad AFTER DELETE ON books BEGIN
  INSERT INTO books_fts(books_fts, rowid, title, author) VALUES('delete', old.rowid, old.title, old.author);
END;

CREATE TRIGGER IF NOT EXISTS books_au AFTER UPDATE ON books BEGIN
  INSERT INTO books_fts(books_fts, rowid, title, author) VALUES('delete', old.rowid, old.title, old.author);
  INSERT INTO books_fts(rowid, title, author) VALUES (new.rowid, new.title, new.author);
END;

INSERT INTO books_fts(rowid, title, author) SELECT rowid, title, author FROM books;
  `);
  console.log("Re-created with trigram");
  const stmt = db.prepare(`SELECT rowid, title FROM books_fts WHERE books_fts MATCH 'test*'`);
  console.log(stmt.all());
} catch (e) {
  console.error("Failed:", e);
}
