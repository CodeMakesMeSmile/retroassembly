ALTER TABLE `roms` ADD `disc_group` text;--> statement-breakpoint
ALTER TABLE `roms` ADD `disc_number` integer;--> statement-breakpoint
CREATE INDEX `idx_roms_user_platform_disc_group` ON `roms` (`user_id`,`platform`,`disc_group`);--> statement-breakpoint
ALTER TABLE `states` ADD `disc` integer;