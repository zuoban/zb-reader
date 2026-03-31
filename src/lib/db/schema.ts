import { sqliteTable, text, integer, real, unique, index } from "drizzle-orm/sqlite-core";
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

export const books = sqliteTable(
  "books",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    author: text("author").default("未知作者"),
    cover: text("cover"),
    filePath: text("file_path").notNull(),
    fileSize: integer("file_size").notNull(),
    format: text("format", { enum: ["epub"] }).notNull(),
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
  },
  (table) => ({
    uploaderIdIdx: index("idx_books_uploader_id").on(table.uploaderId),
  })
);

export const readingProgress = sqliteTable(
  "reading_progress",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    bookId: text("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    version: integer("version").default(1).notNull(),
    progress: real("progress").default(0).notNull(),
    location: text("location"),
    scrollRatio: real("scroll_ratio"),
    currentPage: integer("current_page"),
    totalPages: integer("total_pages"),
    readingDuration: integer("reading_duration").notNull().default(0),
    deviceId: text("device_id"),
    lastReadAt: text("last_read_at")
      .default(sql`(datetime('now'))`)
      .notNull(),
    createdAt: text("created_at")
      .default(sql`(datetime('now'))`)
      .notNull(),
    updatedAt: text("updated_at")
      .default(sql`(datetime('now'))`)
      .notNull(),
  },
  (table) => ({
    userBookUnique: unique().on(table.userId, table.bookId),
    userIdIdx: index("idx_reading_progress_user_id").on(table.userId),
    lastReadAtIdx: index("idx_reading_progress_last_read_at").on(table.lastReadAt),
  })
);

export const progressHistory = sqliteTable(
  "progress_history",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    bookId: text("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    progress: real("progress").notNull(),
    location: text("location"),
    scrollRatio: real("scroll_ratio"),
    readingDuration: integer("reading_duration").notNull(),
    deviceId: text("device_id"),
    deviceName: text("device_name"),
    createdAt: text("created_at")
      .default(sql`(datetime('now'))`)
      .notNull(),
  },
  (table) => ({
    userBookIdx: index("idx_progress_history_user_book").on(table.userId, table.bookId),
    createdAtIdx: index("idx_progress_history_created_at").on(table.createdAt),
  })
);

export const bookmarks = sqliteTable(
  "bookmarks",
  {
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
  },
  (table) => ({
    userBookIdx: index("idx_bookmarks_user_book").on(table.userId, table.bookId),
  })
);

export const notes = sqliteTable(
  "notes",
  {
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
  },
  (table) => ({
    userBookIdx: index("idx_notes_user_book").on(table.userId, table.bookId),
  })
);

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
  pageWidth: integer("page_width").default(100).notNull(),
  theme: text("theme", { enum: ["light", "dark", "sepia"] })
    .default("light")
    .notNull(),
  browserVoiceId: text("browser_voice_id"),
  ttsRate: real("tts_rate").default(1).notNull(),
  microsoftPreloadCount: integer("microsoft_preload_count").default(3).notNull(),
  ttsAutoNextChapter: integer("tts_auto_next_chapter", { mode: "boolean" })
    .default(false)
    .notNull(),
  ttsHighlightColor: text("tts_highlight_color").default("#3b82f6").notNull(),
  fontFamily: text("font_family").default("system").notNull(),
  autoScrollToActive: integer("auto_scroll_to_active", { mode: "boolean" })
    .default(true)
    .notNull(),
  flipMode: text("flip_mode", { enum: ["scroll", "page"] })
    .default("scroll")
    .notNull(),
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
export type ProgressHistory = typeof progressHistory.$inferSelect;
export type NewProgressHistory = typeof progressHistory.$inferInsert;
export type Bookmark = typeof bookmarks.$inferSelect;
export type NewBookmark = typeof bookmarks.$inferInsert;
export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
export type TtsConfig = typeof ttsConfigs.$inferSelect;
export type NewTtsConfig = typeof ttsConfigs.$inferInsert;
export type ReaderSettings = typeof readerSettings.$inferSelect;
export type NewReaderSettings = typeof readerSettings.$inferInsert;
