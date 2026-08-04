import { sql } from "drizzle-orm";
import { getDb } from "../../../db";

let ready: Promise<void> | null = null;

export function ensureCustomRequestSchema() {
  if (!ready) {
    ready = (async () => {
      const db = getDb();

      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS custom_vehicle_requests (
          id text PRIMARY KEY,
          customer_type text NOT NULL,
          first_name text NOT NULL,
          last_name text NOT NULL,
          email text NOT NULL,
          phone text NOT NULL,
          province text,
          business_name text,
          vat_number text,
          brand text,
          model_or_segment text,
          monthly_budget_cents integer,
          max_deposit_cents integer,
          duration_months integer,
          annual_km integer,
          fuel text,
          transmission text,
          delivery_timing text,
          notes text,
          status text NOT NULL DEFAULT 'NEW',
          assigned_to text,
          privacy_version text NOT NULL,
          privacy_accepted_at text NOT NULL DEFAULT CURRENT_TIMESTAMP,
          marketing_consent boolean NOT NULL DEFAULT false,
          submission_key text,
          source text NOT NULL DEFAULT 'ECCOMI_NOLEGGIO_CUSTOM_REQUEST',
          created_at text NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at text NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await db.execute(sql`
        CREATE UNIQUE INDEX IF NOT EXISTS custom_vehicle_requests_submission_key_idx
        ON custom_vehicle_requests(submission_key)
      `);

      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS custom_vehicle_requests_status_idx
        ON custom_vehicle_requests(status)
      `);

      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS custom_vehicle_requests_created_idx
        ON custom_vehicle_requests(created_at)
      `);
    })().catch((error) => {
      ready = null;
      throw error;
    });
  }

  return ready;
}
