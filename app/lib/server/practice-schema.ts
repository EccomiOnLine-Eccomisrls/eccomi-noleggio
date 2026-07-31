import { sql } from "drizzle-orm";
import { getDb } from "../../../db";

let ready: Promise<void> | null = null;

export function ensurePracticeSchema() {
  if (!ready) {
    ready = (async () => {
      const db = getDb();
      await db.execute(sql`ALTER TABLE partners ADD COLUMN IF NOT EXISTS additional_emails_json text NOT NULL DEFAULT '[]'`);
      await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS account_holder text`);
      await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS iban_encrypted text`);
      await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS iban_last4 text`);
      await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS completed_at text`);
      await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS sent_to_partner_at text`);
      await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'NORMAL'`);
      await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS assigned_to text`);
      await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS assigned_at text`);
      await db.execute(sql`ALTER TABLE leads ALTER COLUMN assigned_at DROP NOT NULL`);
      await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS deleted_at text`);
      await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS deleted_by text`);
      await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS delete_reason text`);
      await db.execute(sql`CREATE TABLE IF NOT EXISTS practice_documents (
        id text PRIMARY KEY,
        lead_id text NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
        document_type text NOT NULL,
        original_name text NOT NULL,
        mime_type text NOT NULL,
        size_bytes integer NOT NULL,
        storage_bucket text NOT NULL,
        storage_key text NOT NULL,
        status text NOT NULL DEFAULT 'UPLOADED',
        uploaded_by text NOT NULL DEFAULT 'CUSTOMER',
        created_at text NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at text NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS practice_documents_lead_idx ON practice_documents(lead_id)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS practice_documents_type_idx ON practice_documents(document_type)`);
    })().catch((error) => {
      ready = null;
      throw error;
    });
  }
  return ready;
}
