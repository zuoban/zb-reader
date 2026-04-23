ALTER TABLE `tts_configs` ADD `user_id` text REFERENCES users(id) ON DELETE cascade;--> statement-breakpoint
CREATE INDEX `idx_tts_configs_user_id` ON `tts_configs` (`user_id`);
