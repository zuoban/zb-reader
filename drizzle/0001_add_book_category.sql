ALTER TABLE `books` ADD `category` text;--> statement-breakpoint
CREATE INDEX `idx_books_category` ON `books` (`category`);
