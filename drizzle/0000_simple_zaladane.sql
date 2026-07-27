CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_email` text NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`payload_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_entity_idx` ON `audit_logs` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `audit_actor_idx` ON `audit_logs` (`actor_email`);--> statement-breakpoint
CREATE TABLE `commissions` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`partner_id` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`status` text DEFAULT 'ACCRUED' NOT NULL,
	`accrued_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`invoiced_at` text,
	`paid_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`partner_id`) REFERENCES `partners`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `commissions_partner_idx` ON `commissions` (`partner_id`);--> statement-breakpoint
CREATE TABLE `leads` (
	`id` text PRIMARY KEY NOT NULL,
	`promotion_id` text NOT NULL,
	`partner_id` text NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`phone` text NOT NULL,
	`email` text NOT NULL,
	`province` text,
	`customer_type` text,
	`trade_in` integer DEFAULT false NOT NULL,
	`contact_window` text,
	`status` text DEFAULT 'NEW' NOT NULL,
	`privacy_version` text NOT NULL,
	`marketing_consent` integer DEFAULT false NOT NULL,
	`source` text DEFAULT 'SHOPIFY' NOT NULL,
	`assigned_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`promotion_id`) REFERENCES `promotions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`partner_id`) REFERENCES `partners`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `leads_partner_idx` ON `leads` (`partner_id`);--> statement-breakpoint
CREATE INDEX `leads_promotion_idx` ON `leads` (`promotion_id`);--> statement-breakpoint
CREATE INDEX `leads_status_idx` ON `leads` (`status`);--> statement-breakpoint
CREATE TABLE `partners` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`legal_name` text NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`contact_name` text,
	`contact_email` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `promotions` (
	`id` text PRIMARY KEY NOT NULL,
	`offer_number` text NOT NULL,
	`provider` text NOT NULL,
	`partner_id` text NOT NULL,
	`source_label` text NOT NULL,
	`brand` text NOT NULL,
	`model` text NOT NULL,
	`version` text DEFAULT '' NOT NULL,
	`monthly_gross_cents` integer NOT NULL,
	`monthly_net_cents` integer,
	`deposit_gross_cents` integer DEFAULT 0 NOT NULL,
	`duration_months` integer NOT NULL,
	`total_km` integer NOT NULL,
	`valid_from` text,
	`valid_until` text NOT NULL,
	`delivery` text DEFAULT '' NOT NULL,
	`fuel` text DEFAULT '' NOT NULL,
	`transmission` text DEFAULT '' NOT NULL,
	`color` text DEFAULT '' NOT NULL,
	`power_kw` text DEFAULT '' NOT NULL,
	`services_json` text DEFAULT '[]' NOT NULL,
	`warnings_json` text DEFAULT '[]' NOT NULL,
	`confidence` text DEFAULT 'media' NOT NULL,
	`status` text DEFAULT 'PENDING_APPROVAL' NOT NULL,
	`quote_key` text,
	`quote_file_name` text,
	`cover_key` text,
	`shopify_product_id` text,
	`shopify_handle` text,
	`shopify_url` text,
	`approved_by` text,
	`approved_at` text,
	`published_at` text,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`partner_id`) REFERENCES `partners`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `promotions_offer_provider_idx` ON `promotions` (`offer_number`,`provider`);--> statement-breakpoint
CREATE INDEX `promotions_partner_idx` ON `promotions` (`partner_id`);--> statement-breakpoint
CREATE INDEX `promotions_status_idx` ON `promotions` (`status`);--> statement-breakpoint
CREATE INDEX `promotions_valid_until_idx` ON `promotions` (`valid_until`);--> statement-breakpoint
CREATE TABLE `users` (
	`email` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`role` text NOT NULL,
	`partner_id` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`partner_id`) REFERENCES `partners`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `users_partner_idx` ON `users` (`partner_id`);