CREATE TABLE `bookmarks` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`book_id` text NOT NULL,
	`location` text NOT NULL,
	`label` text,
	`page_number` integer,
	`progress` real,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_bookmarks_user_book` ON `bookmarks` (`user_id`,`book_id`);--> statement-breakpoint
CREATE TABLE `books` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`author` text DEFAULT '未知作者',
	`cover` text,
	`file_path` text NOT NULL,
	`file_size` integer NOT NULL,
	`format` text NOT NULL,
	`description` text,
	`isbn` text,
	`publisher` text,
	`publish_date` text,
	`language` text,
	`uploader_id` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`uploader_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_books_uploader_id` ON `books` (`uploader_id`);--> statement-breakpoint
CREATE TABLE `notes` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`book_id` text NOT NULL,
	`location` text NOT NULL,
	`selected_text` text,
	`content` text,
	`color` text DEFAULT 'yellow',
	`page_number` integer,
	`progress` real,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_notes_user_book` ON `notes` (`user_id`,`book_id`);--> statement-breakpoint
CREATE TABLE `progress_history` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`book_id` text NOT NULL,
	`version` integer NOT NULL,
	`progress` real NOT NULL,
	`location` text,
	`scroll_ratio` real,
	`reading_duration` integer NOT NULL,
	`device_id` text,
	`device_name` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_progress_history_user_book` ON `progress_history` (`user_id`,`book_id`);--> statement-breakpoint
CREATE INDEX `idx_progress_history_created_at` ON `progress_history` (`created_at`);--> statement-breakpoint
CREATE TABLE `reader_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`font_size` integer DEFAULT 16 NOT NULL,
	`page_width` integer DEFAULT 100 NOT NULL,
	`theme` text DEFAULT 'light' NOT NULL,
	`browser_voice_id` text,
	`tts_rate` real DEFAULT 1 NOT NULL,
	`microsoft_preload_count` integer DEFAULT 3 NOT NULL,
	`tts_auto_next_chapter` integer DEFAULT false NOT NULL,
	`tts_highlight_color` text DEFAULT '#3b82f6' NOT NULL,
	`font_family` text DEFAULT 'system' NOT NULL,
	`auto_scroll_to_active` integer DEFAULT true NOT NULL,
	`flip_mode` text DEFAULT 'scroll' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reader_settings_user_id_unique` ON `reader_settings` (`user_id`);--> statement-breakpoint
CREATE TABLE `reading_progress` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`book_id` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`progress` real DEFAULT 0 NOT NULL,
	`location` text,
	`scroll_ratio` real,
	`current_page` integer,
	`total_pages` integer,
	`reading_duration` integer DEFAULT 0 NOT NULL,
	`device_id` text,
	`last_read_at` text DEFAULT (datetime('now')) NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_reading_progress_user_id` ON `reading_progress` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_reading_progress_last_read_at` ON `reading_progress` (`last_read_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `reading_progress_user_id_book_id_unique` ON `reading_progress` (`user_id`,`book_id`);--> statement-breakpoint
CREATE TABLE `tts_configs` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`method` text DEFAULT 'GET' NOT NULL,
	`headers` text,
	`body` text,
	`content_type` text,
	`concurrent_rate` integer,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`email` text NOT NULL,
	`password` text NOT NULL,
	`avatar` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);