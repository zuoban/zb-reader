ALTER TABLE `reading_progress` ADD `furthest_progress` real NOT NULL DEFAULT 0;--> statement-breakpoint
UPDATE `reading_progress` SET `furthest_progress` = COALESCE(`progress`, 0) WHERE `furthest_progress` = 0;
