import { eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { auditLogs, partners, promotions } from "../../../../../db/schema";
import { isInternalEccomiPartner } from "../../../../lib/partner-identity";
import { requirePermission, routeError } from "../../../../lib/server/authz";
import { getPromotionEccomiCommission } from "../../../../lib/server/commission-service";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requirePermission(request, "QUOTE_APPROVE");
    const { id } = await context.params;
    const [row] = await getDb()
      .select({ promotion: promotions, partnerName: partners.name, partnerLegalName: partners.legalName })
      .from(promotions)
      .innerJoin(partners, eq(promotions.partnerId, partners.id))
      .where(eq(promotions.id, id))
      .limit(1);
    if (!row) return Response.json({ error: "Promozione non trovata." }, { status: 404 });

    const promotion = row.promotion;
    if (promotion.status === "EXPIRED" || promotion.status === "ARCHIVED") {
      return Response.json({ error: "La quotazione è scaduta e non può essere approvata." }, { status: 409 });
    }
    if (promotion.status !== "PENDING_APPROVAL") {
      return Response.json({ ok: true, status: promotion.status });
    }

    const internalEccomi = isInternalEccomiPartner({ name: row.partnerName, legalName: row.partnerLegalName });
    const commissionCents = await getPromotionEccomiCommission(id);
    if (!internalEccomi && commissionCents === null) {
      return Response.json({
        error: "Definisci prima la provvigione ECCOMI prevista a contratto concluso.",
      }, { status: 409 });
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
      payloadJson: JSON.stringify({
        previousStatus: promotion.status,
        eccomiCommissionCents: commissionCents ?? 0,
        internalEccomi,
        actorRole: actor.role,
      }),
    });
    return Response.json({ ok: true, status: "APPROVED", eccomiCommissionCents: commissionCents ?? 0 });
  } catch (error) {
    return routeError(error);
  }
}
