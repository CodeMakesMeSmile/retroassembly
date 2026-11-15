CREATE TABLE `game_saves` (
	`client_id` text,
	`core` text NOT NULL,
	`platform` text NOT NULL,
	`rom_id` text NOT NULL,
	`sha1` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` integer NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`status` integer DEFAULT 1 NOT NULL,
	`updated_at` integer NOT NULL,
	`file_id` text NOT NULL,
	`user_id` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_game_saves_user_rom_core` ON `game_saves` (`user_id`,`rom_id`,`core`,`status`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_game_saves_user_client_id` ON `game_saves` (`user_id`,`client_id`);