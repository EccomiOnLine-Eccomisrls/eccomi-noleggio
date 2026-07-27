import { eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { auditLogs, promotions } from "../../../../../db/schema";
import { requireCeo, routeError } from "../../../../lib/server/authz";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireCeo(request);
    const { id } = await context.params;
    const [promotion] = await getDb().select().from(promotions).where(eq(promotions.id, id)).limit(1);
    if (!promotion) return Response.json({ error: "Promozione non trovata." }, { status: 404 });
    if (promotion.status === "EXPIRED" || promotion.status === "ARCHIVED") {
      return Response.json({ error: "La quotazione è scaduta e non può essere approvata." }, { status: 409 });
    }
    if (promotion.status !== "PENDING_APPROVAL") {
      return Response.json({ ok: true, status: promotion.status });
    }
    const now = new Date().toISOString();
    await getDb().update(promotions).set({
      status: "APPROVED",
      approvedBy: actor.email,
      approvedAt: now,
      updatedAt: now,
    }).where(eq(promotions.id, id));
    await getDb().insert(auditLogs).values({
      id: crypto.randomUUID(),
      actorEmail: actor.email,
      action: "PROMOTION_APPROVED",
      entityType: "promotion",
      entityId: id,
      payloadJson: JSON.stringify({ previousStatus: promotion.status }),
    });
    return Response.json({ ok: true, status: "APPROVED" });
  } catch (error) {
    return routeError(error);
  }
}
