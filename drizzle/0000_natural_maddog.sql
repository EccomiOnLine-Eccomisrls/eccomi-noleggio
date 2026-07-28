CREATE TABLE "ai_integrations" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text DEFAULT 'OPENAI' NOT NULL,
	"encrypted_api_key" text NOT NULL,
	"text_model" text DEFAULT 'gpt-5.6-terra' NOT NULL,
	"image_model" text DEFAULT 'gpt-image-2' NOT NULL,
	"status" text DEFAULT 'CONNECTED' NOT NULL,
	"connected_by" text NOT NULL,
	"connected_at" text NOT NULL,
	"verified_at" text NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_email" text NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"payload_json" text DEFAULT '{}' NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commissions" (
	"id" text PRIMARY KEY NOT NULL,
	"lead_id" text NOT NULL,
	"partner_id" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"status" text DEFAULT 'ACCRUED' NOT NULL,
	"accrued_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"invoiced_at" text,
	"paid_at" text,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hub_events" (
	"id" text PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"ecosystem" text DEFAULT 'ECCOMI_NOLEGGIO' NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"title" text NOT NULL,
	"payload_json" text DEFAULT '{}' NOT NULL,
	"actor_email" text NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integrations" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"shop_domain" text NOT NULL,
	"shop_name" text DEFAULT '' NOT NULL,
	"storefront_url" text DEFAULT '' NOT NULL,
	"client_id" text NOT NULL,
	"encrypted_client_secret" text NOT NULL,
	"publication_id" text NOT NULL,
	"publication_label" text DEFAULT 'Negozio online' NOT NULL,
	"publication_auto_publish" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'CONNECTED' NOT NULL,
	"connected_by" text NOT NULL,
	"connected_at" text NOT NULL,
	"verified_at" text NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" text PRIMARY KEY NOT NULL,
	"promotion_id" text NOT NULL,
	"partner_id" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text NOT NULL,
	"province" text,
	"customer_type" text,
	"business_name" text,
	"vat_number" text,
	"trade_in" boolean DEFAULT false NOT NULL,
	"contact_window" text,
	"status" text DEFAULT 'NEW' NOT NULL,
	"document_status" text DEFAULT 'PENDING_EMAIL_VERIFICATION' NOT NULL,
	"email_verification_status" text DEFAULT 'PENDING' NOT NULL,
	"privacy_version" text NOT NULL,
	"privacy_accepted_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"marketing_consent" boolean DEFAULT false NOT NULL,
	"submission_key" text,
	"source" text DEFAULT 'SHOPIFY' NOT NULL,
	"assigned_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partners" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"legal_name" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"contact_name" text,
	"contact_email" text,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promotions" (
	"id" text PRIMARY KEY NOT NULL,
	"offer_number" text NOT NULL,
	"provider" text NOT NULL,
	"partner_id" text NOT NULL,
	"source_label" text NOT NULL,
	"brand" text NOT NULL,
	"model" text NOT NULL,
	"version" text DEFAULT '' NOT NULL,
	"monthly_gross_cents" integer NOT NULL,
	"monthly_net_cents" integer,
	"deposit_gross_cents" integer DEFAULT 0 NOT NULL,
	"duration_months" integer NOT NULL,
	"total_km" integer NOT NULL,
	"valid_from" text,
	"valid_until" text NOT NULL,
	"delivery" text DEFAULT '' NOT NULL,
	"fuel" text DEFAULT '' NOT NULL,
	"transmission" text DEFAULT '' NOT NULL,
	"color" text DEFAULT '' NOT NULL,
	"power_kw" text DEFAULT '' NOT NULL,
	"services_json" text DEFAULT '[]' NOT NULL,
	"warnings_json" text DEFAULT '[]' NOT NULL,
	"confidence" text DEFAULT 'media' NOT NULL,
	"status" text DEFAULT 'PENDING_APPROVAL' NOT NULL,
	"quote_key" text,
	"quote_file_name" text,
	"cover_key" text,
	"cover_source_kind" text,
	"cover_source_url" text,
	"cover_attribution" text,
	"automation_status" text DEFAULT 'READY' NOT NULL,
	"automation_error" text,
	"extraction_method" text DEFAULT 'RULES' NOT NULL,
	"shopify_product_id" text,
	"shopify_handle" text,
	"shopify_url" text,
	"shopify_collection_id" text,
	"approved_by" text,
	"approved_at" text,
	"published_at" text,
	"created_by" text NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"email" text PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"role" text NOT NULL,
	"partner_id" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_promotion_id_promotions_id_fk" FOREIGN KEY ("promotion_id") REFERENCES "public"."promotions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ai_integrations_provider_idx" ON "ai_integrations" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "audit_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_actor_idx" ON "audit_logs" USING btree ("actor_email");--> statement-breakpoint
CREATE INDEX "commissions_partner_idx" ON "commissions" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX "hub_events_entity_idx" ON "hub_events" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "hub_events_created_idx" ON "hub_events" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "integrations_provider_idx" ON "integrations" USING btree ("provider");--> statement-breakpoint
CREATE UNIQUE INDEX "leads_submission_key_idx" ON "leads" USING btree ("submission_key");--> statement-breakpoint
CREATE INDEX "leads_partner_idx" ON "leads" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX "leads_promotion_idx" ON "leads" USING btree ("promotion_id");--> statement-breakpoint
CREATE INDEX "leads_status_idx" ON "leads" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "promotions_offer_provider_idx" ON "promotions" USING btree ("offer_number","provider");--> statement-breakpoint
CREATE INDEX "promotions_partner_idx" ON "promotions" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX "promotions_status_idx" ON "promotions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "promotions_valid_until_idx" ON "promotions" USING btree ("valid_until");--> statement-breakpoint
CREATE INDEX "users_partner_idx" ON "users" USING btree ("partner_id");