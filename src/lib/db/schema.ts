import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  avatar: text("avatar"),
  createdAt: text("created_at")
    .default(sql`(datetime('now'))`)
    .notNull(),
  updatedAt: text("updated_at")
    .default(sql`(datetime('now'))`)
    .notNull(),
});

export const books = sqliteTable("books", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  author: text("author").default("未知作者"),
  cover: text("cover"),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size").notNull(),
  format: text("format", { enum: ["epub", "pdf", "txt", "mobi"] }).notNull(),
  description: text("description"),
  isbn: text("isbn"),
  publisher: text("publisher"),
  publishDate: text("publish_date"),
  language: text("language"),
  uploaderId: text("uploader_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: text("created_at")
    .default(sql`(datetime('now'))`)
    .notNull(),
  updatedAt: text("updated_at")
    .default(sql`(datetime('now'))`)
    .notNull(),
});

export const readingProgress = sqliteTable("reading_progress", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  bookId: text("book_id")
    .notNull()
    .references(() => books.id, { onDelete: "cascade" }),
  progress: real("progress").default(0).notNull(),
  location: text("location"),
  currentPage: integer("current_page"),
  totalPages: integer("total_pages"),
  lastReadAt: text("last_read_at")
    .default(sql`(datetime('now'))`)
    .notNull(),
  createdAt: text("created_at")
    .default(sql`(datetime('now'))`)
    .notNull(),
  updatedAt: text("updated_at")
    .default(sql`(datetime('now'))`)
    .notNull(),
});

export const bookmarks = sqliteTable("bookmarks", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  bookId: text("book_id")
    .notNull()
    .references(() => books.id, { onDelete: "cascade" }),
  location: text("location").notNull(),
  label: text("label"),
  pageNumber: integer("page_number"),
  progress: real("progress"),
  createdAt: text("created_at")
    .default(sql`(datetime('now'))`)
    .notNull(),
  updatedAt: text("updated_at")
    .default(sql`(datetime('now'))`)
    .notNull(),
});

export const notes = sqliteTable("notes", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  bookId: text("book_id")
    .notNull()
    .references(() => books.id, { onDelete: "cascade" }),
  location: text("location").notNull(),
  selectedText: text("selected_text"),
  content: text("content"),
  color: text("color").default("yellow"),
  pageNumber: integer("page_number"),
  progress: real("progress"),
  createdAt: text("created_at")
    .default(sql`(datetime('now'))`)
    .notNull(),
  updatedAt: text("updated_at")
    .default(sql`(datetime('now'))`)
    .notNull(),
});

export const ttsConfigs = sqliteTable("tts_configs", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  method: text("method").default("GET").notNull(),
  headers: text("headers", { mode: "json" }),
  body: text("body", { mode: "json" }),
  contentType: text("content_type"),
  concurrentRate: integer("concurrent_rate"),
  createdAt: text("created_at")
    .default(sql`(datetime('now'))`)
    .notNull(),
  updatedAt: text("updated_at")
    .default(sql`(datetime('now'))`)
    .notNull(),
});

export const readerSettings = sqliteTable("reader_settings", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  fontSize: integer("font_size").default(16).notNull(),
  theme: text("theme", { enum: ["light", "dark", "sepia"] })
    .default("light")
    .notNull(),
  ttsEngine: text("tts_engine", { enum: ["browser", "legado"] })
    .default("browser")
    .notNull(),
  browserVoiceId: text("browser_voice_id"),
  ttsRate: real("tts_rate").default(1).notNull(),
  ttsPitch: real("tts_pitch").default(1).notNull(),
  ttsVolume: real("tts_volume").default(1).notNull(),
  microsoftPreloadCount: integer("microsoft_preload_count").default(3).notNull(),
  legadoRate: integer("legado_rate").default(50).notNull(),
  legadoConfigId: text("legado_config_id"),
  legadoPreloadCount: integer("legado_preload_count").default(3).notNull(),
  ttsImmersiveMode: integer("tts_immersive_mode").default(0).notNull(),
  createdAt: text("created_at")
    .default(sql`(datetime('now'))`)
    .notNull(),
  updatedAt: text("updated_at")
    .default(sql`(datetime('now'))`)
    .notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Book = typeof books.$inferSelect;
export type NewBook = typeof books.$inferInsert;
export type ReadingProgress = typeof readingProgress.$inferSelect;
export type NewReadingProgress = typeof readingProgress.$inferInsert;
export type Bookmark = typeof bookmarks.$inferSelect;
export type NewBookmark = typeof bookmarks.$inferInsert;
export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
export type TtsConfig = typeof ttsConfigs.$inferSelect;
export type NewTtsConfig = typeof ttsConfigs.$inferInsert;
export type ReaderSettings = typeof readerSettings.$inferSelect;
export type NewReaderSettings = typeof readerSettings.$inferInsert;
