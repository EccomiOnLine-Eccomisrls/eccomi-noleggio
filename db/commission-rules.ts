import { sql } from "drizzle-orm";
import { index, integer, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";

export const commissionRules = pgTable("commission_rules", {
  id: text("id").primaryKey(),
  scope: text("scope").notNull(),
  entityId: text("entity_id").notNull(),
  amountCents: integer("amount_cents").notNull(),
  updatedBy: text("updated_by").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("commission_rules_scope_entity_idx").on(table.scope, table.entityId),
  index("commission_rules_scope_idx").on(table.scope),
]);
