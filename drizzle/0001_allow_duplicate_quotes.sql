DROP INDEX IF EXISTS "promotions_offer_provider_idx";
CREATE INDEX IF NOT EXISTS "promotions_offer_provider_idx" ON "promotions" USING btree ("offer_number", "provider");
