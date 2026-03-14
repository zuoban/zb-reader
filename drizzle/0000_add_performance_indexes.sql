-- 添加索引以优化查询性能
-- 执行方式: npx drizzle-kit sql

-- 书籍表: 按上传者查询
CREATE INDEX IF NOT EXISTS idx_books_uploader_id ON books (uploader_id);

-- 阅读历史表: 按用户和书籍组合查询
CREATE INDEX IF NOT EXISTS idx_progress_history_user_book ON progress_history (user_id, book_id);
-- 阅读历史表: 按创建时间排序
CREATE INDEX IF NOT EXISTS idx_progress_history_created_at ON progress_history (created_at);

-- 书签表: 按用户和书籍组合查询
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_book ON bookmarks (user_id, book_id);

-- 笔记表: 按用户和书籍组合查询
CREATE INDEX IF NOT EXISTS idx_notes_user_book ON notes (user_id, book_id);