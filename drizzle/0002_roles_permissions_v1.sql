CREATE TABLE IF NOT EXISTS "user_permission_grants" (
  "id" text PRIMARY KEY NOT NULL,
  "user_email" text NOT NULL,
  "permission" text NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "granted_by" text NOT NULL,
  "granted_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "revoked_at" text,
  "updated_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "user_permission_grants_user_email_users_email_fk"
    FOREIGN KEY ("user_email") REFERENCES "public"."users"("email")
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_permission_grants_user_permission_idx"
  ON "user_permission_grants" USING btree ("user_email", "permission");

CREATE INDEX IF NOT EXISTS "user_permission_grants_user_idx"
  ON "user_permission_grants" USING btree ("user_email");
