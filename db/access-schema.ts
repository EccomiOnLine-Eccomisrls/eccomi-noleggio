import { sql } from "drizzle-orm";
import { boolean, index, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./schema";

export const userPermissionGrants = pgTable("user_permission_grants", {
  id: text("id").primaryKey(),
  userEmail: text("user_email").notNull().references(() => users.email),
  permission: text("permission").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  grantedBy: text("granted_by").notNull(),
  grantedAt: text("granted_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  revokedAt: text("revoked_at"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("user_permission_grants_user_permission_idx").on(table.userEmail, table.permission),
  index("user_permission_grants_user_idx").on(table.userEmail),
]);
