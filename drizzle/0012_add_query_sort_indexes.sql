CREATE INDEX `idx_books_uploader_updated_at` ON `books` (`uploader_id`, `updated_at`);
CREATE INDEX `idx_books_uploader_category_updated_at` ON `books` (`uploader_id`, `category`, `updated_at`);
CREATE INDEX `idx_bookmarks_user_book_created_at` ON `bookmarks` (`user_id`, `book_id`, `created_at`);
CREATE INDEX `idx_notes_user_book_created_at` ON `notes` (`user_id`, `book_id`, `created_at`);
