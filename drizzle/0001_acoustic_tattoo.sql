CREATE TABLE `integrations` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`shop_domain` text NOT NULL,
	`shop_name` text DEFAULT '' NOT NULL,
	`storefront_url` text DEFAULT '' NOT NULL,
	`client_id` text NOT NULL,
	`encrypted_client_secret` text NOT NULL,
	`publication_id` text NOT NULL,
	`publication_label` text DEFAULT 'Negozio online' NOT NULL,
	`publication_auto_publish` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'CONNECTED' NOT NULL,
	`connected_by` text NOT NULL,
	`connected_at` text NOT NULL,
	`verified_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `integrations_provider_idx` ON `integrations` (`provider`);