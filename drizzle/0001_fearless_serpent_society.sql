ALTER TABLE "leads"
ADD COLUMN IF NOT EXISTS "priority" text DEFAULT 'NORMAL' NOT NULL;

ALTER TABLE "leads"
ADD COLUMN IF NOT EXISTS "assigned_to" text;

ALTER TABLE "leads"
ADD COLUMN IF NOT EXISTS "deleted_at" text;

ALTER TABLE "leads"
ADD COLUMN IF NOT EXISTS "deleted_by" text;

ALTER TABLE "leads"
ADD COLUMN IF NOT EXISTS "delete_reason" text;
