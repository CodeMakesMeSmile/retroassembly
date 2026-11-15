ALTER TABLE `states` ADD `client_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_states_user_client_id` ON `states` (`user_id`,`client_id`);