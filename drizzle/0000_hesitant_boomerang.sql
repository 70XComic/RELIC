CREATE TABLE `game_saves` (
	`user_id` text PRIMARY KEY NOT NULL,
	`profile_json` text NOT NULL,
	`updated_at` integer NOT NULL
);
