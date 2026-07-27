CREATE TABLE `ai_integrations` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text DEFAULT 'OPENAI' NOT NULL,
	`encrypted_api_key` text NOT NULL,
	`text_model` text DEFAULT 'gpt-5.6-terra' NOT NULL,
	`image_model` text DEFAULT 'gpt-image-2' NOT NULL,
	`status` text DEFAULT 'CONNECTED' NOT NULL,
	`connected_by` text NOT NULL,
	`connected_at` text NOT NULL,
	`verified_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ai_integrations_provider_idx` ON `ai_integrations` (`provider`);--> statement-breakpoint
CREATE TABLE `hub_events` (
	`id` text PRIMARY KEY NOT NULL,
	`event_type` text NOT NULL,
	`ecosystem` text DEFAULT 'ECCOMI_NOLEGGIO' NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`title` text NOT NULL,
	`payload_json` text DEFAULT '{}' NOT NULL,
	`actor_email` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `hub_events_entity_idx` ON `hub_events` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `hub_events_created_idx` ON `hub_events` (`created_at`);--> statement-breakpoint
ALTER TABLE `promotions` ADD `cover_source_kind` text;--> statement-breakpoint
ALTER TABLE `promotions` ADD `cover_source_url` text;--> statement-breakpoint
ALTER TABLE `promotions` ADD `cover_attribution` text;--> statement-breakpoint
ALTER TABLE `promotions` ADD `automation_status` text DEFAULT 'READY' NOT NULL;--> statement-breakpoint
ALTER TABLE `promotions` ADD `automation_error` text;--> statement-breakpoint
ALTER TABLE `promotions` ADD `extraction_method` text DEFAULT 'RULES' NOT NULL;--> statement-breakpoint
ALTER TABLE `promotions` ADD `shopify_collection_id` text;