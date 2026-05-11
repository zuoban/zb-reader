-- Create an external content FTS5 table linked to the books table
CREATE VIRTUAL TABLE IF NOT EXISTS books_fts USING fts5(
  title, 
  author,
  content='books', 
  content_rowid='rowid',
  tokenize='trigram'
);

-- Triggers to keep the FTS index up to date
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

-- Populate the FTS table with existing data
INSERT INTO books_fts(rowid, title, author) SELECT rowid, title, author FROM books;
