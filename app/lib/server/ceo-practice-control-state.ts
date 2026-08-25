import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { leads } from "../../../db/schema";
import { isRenderPullRequestPreview } from "./preview-mode";

export type CeoPracticeControlState = {
  priority: string;
  assignedTo: string | null;
};

export async function getCeoPracticeControlState(
  request: Request,
  id: string,
): Promise<CeoPracticeControlState> {
  if (isRenderPullRequestPreview(request)) {
    return {
      priority: "NORMAL",
      assignedTo: null,
    };
  }

  const db = getDb();
  const [row] = await db
    .select({
      priority: leads.priority,
      assignedTo: leads.assignedTo,
    })
    .from(leads)
    .where(eq(leads.id, id))
    .limit(1);

  return {
    priority: row?.priority || "NORMAL",
    assignedTo: row?.assignedTo || null,
  };
}
