ALTER TABLE `leads` ADD `business_name` text;--> statement-breakpoint
ALTER TABLE `leads` ADD `vat_number` text;--> statement-breakpoint
ALTER TABLE `leads` ADD `document_status` text DEFAULT 'PENDING_EMAIL_VERIFICATION' NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `email_verification_status` text DEFAULT 'PENDING' NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `privacy_accepted_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `submission_key` text;--> statement-breakpoint
CREATE UNIQUE INDEX `leads_submission_key_idx` ON `leads` (`submission_key`);