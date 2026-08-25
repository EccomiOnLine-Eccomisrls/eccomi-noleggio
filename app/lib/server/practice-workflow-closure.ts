import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../db";
import { auditLogs } from "../../../db/schema";

const CLOSED_WORKFLOW_ACTIONS = [
  "PRACTICE_STATUS_DELIVERED",
  "PRACTICE_STATUS_ARCHIVED",
] as const;

export async function getPracticeWorkflowClosedAt(
  practiceId: string,
  status: string,
  legacyCompletedAt: string | null,
) {
  if (status !== "DELIVERED" && status !== "ARCHIVED") return null;

  const db = getDb();
  const rows = await db
    .select({
      action: auditLogs.action,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .where(and(
      eq(auditLogs.entityType, "lead"),
      eq(auditLogs.entityId, practiceId),
      inArray(auditLogs.action, [...CLOSED_WORKFLOW_ACTIONS]),
    ))
    .orderBy(desc(auditLogs.createdAt))
    .limit(20);

  const delivered = rows.find((row) => row.action === "PRACTICE_STATUS_DELIVERED");
  if (delivered?.createdAt) return delivered.createdAt;

  const archived = rows.find((row) => row.action === "PRACTICE_STATUS_ARCHIVED");
  return archived?.createdAt || legacyCompletedAt;
}
