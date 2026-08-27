import { and, eq, inArray, isNull } from "drizzle-orm";
import { getDb } from "../../../../../../db";
import { commissionRules } from "../../../../../../db/commission-rules";
import { auditLogs, hubEvents, leads, partners, promotions } from "../../../../../../db/schema";
import { requireCeo, routeError } from "../../../../../lib/server/authz";
import { isRenderPullRequestPreview } from "../../../../../lib/server/preview-mode";

type ReassignPayload = { partnerId?: string };

const previewPartners = [
  { id: "eccomi-direct", name: "ECCOMI DIRETTO", legalName: "ECCOMI SRLS", status: "ACTIVE" },
  { id: "preview-goal-rent", name: "Goal Rent SRL", legalName: "Goal Rent SRL", status: "ACTIVE" },
  { id: "preview-partner-b", name: "Partner B", legalName: "Partner B S.r.l.", status: "ACTIVE" },
];

function cleanId(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function partnerLabel(partner: { id: string; name: string }) {
  return partner.id === "eccomi-direct" ? "ECCOMI DIRETTO" : partner.name;
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({})) as ReassignPayload;
    const targetPartnerId = cleanId(body.partnerId);
    if (!targetPartnerId) return Response.json({ error: "Seleziona la nuova assegnazione." }, { status: 400 });

    if (isRenderPullRequestPreview(request)) {
      const current = previewPartners[1];
      const target = previewPartners.find((partner) => partner.id === targetPartnerId);
      if (!target || target.status !== "ACTIVE") return Response.json({ error: "Destinazione non valida." }, { status: 400 });
      if (target.id === current.id) return Response.json({ error: "L’offerta è già assegnata a questa destinazione." }, { status: 409 });
      return Response.json({
        ok: true,
        preview: true,
        simulated: true,
        promotionId: id,
        fromPartnerId: current.id,
        fromPartner: partnerLabel(current),
        toPartnerId: target.id,
        toPartner: partnerLabel(target),
        baseCommissionPreserved: true,
        partnerIncrementReset: true,
        existingPracticesFrozen: true,
        existingPracticesReassigned: false,
        shopifyChanged: false,
        message: "SIMULAZIONE PREVIEW: nessuna scrittura su Supabase o Shopify.",
      });
    }

    const actor = await requireCeo(request);
    const db = getDb();
    const [promotion] = await db
      .select({ id: promotions.id, offerNumber: promotions.offerNumber, brand: promotions.brand, model: promotions.model, partnerId: promotions.partnerId, shopifyProductId: promotions.shopifyProductId })
      .from(promotions)
      .where(eq(promotions.id, id))
      .limit(1);
    if (!promotion) return Response.json({ error: "Promozione non trovata." }, { status: 404 });

    const [currentPartner] = await db
      .select({ id: partners.id, name: partners.name, legalName: partners.legalName, status: partners.status })
      .from(partners)
      .where(eq(partners.id, promotion.partnerId))
      .limit(1);
    if (!currentPartner) return Response.json({ error: "Assegnazione attuale non trovata." }, { status: 409 });

    const [targetPartner] = await db
      .select({ id: partners.id, name: partners.name, legalName: partners.legalName, status: partners.status })
      .from(partners)
      .where(eq(partners.id, targetPartnerId))
      .limit(1);
    if (!targetPartner || targetPartner.status !== "ACTIVE") {
      return Response.json({ error: "La destinazione deve essere un Partner attivo o ECCOMI DIRETTO." }, { status: 409 });
    }
    if (targetPartner.id === currentPartner.id) {
      return Response.json({ error: "L’offerta è già assegnata a questa destinazione." }, { status: 409 });
    }

    const practiceRows = await db
      .select({ id: leads.id })
      .from(leads)
      .where(and(eq(leads.promotionId, id), isNull(leads.deletedAt)));
    const practiceIds = practiceRows.map((row) => row.id);

    const promotionCommissionRows = await db
      .select({ scope: commissionRules.scope, amountCents: commissionRules.amountCents })
      .from(commissionRules)
      .where(and(eq(commissionRules.entityId, id), inArray(commissionRules.scope, ["PROMOTION", "PARTNER_INCREMENT"])));
    const baseCents = promotionCommissionRows.find((row) => row.scope === "PROMOTION")?.amountCents ?? null;
    const partnerIncrementCents = promotionCommissionRows.find((row) => row.scope === "PARTNER_INCREMENT")?.amountCents ?? 0;
    const frozenTotalCents = baseCents === null ? null : baseCents + partnerIncrementCents;

    let alreadyFrozen = new Set<string>();
    if (practiceIds.length) {
      const snapshots = await db
        .select({ entityId: commissionRules.entityId })
        .from(commissionRules)
        .where(and(eq(commissionRules.scope, "LEAD"), inArray(commissionRules.entityId, practiceIds)));
      alreadyFrozen = new Set(snapshots.map((row) => row.entityId));
    }
    const practicesToFreeze = frozenTotalCents === null
      ? []
      : practiceIds.filter((practiceId) => !alreadyFrozen.has(practiceId));

    const now = new Date().toISOString();
    await db.transaction(async (tx) => {
      if (practicesToFreeze.length && frozenTotalCents !== null) {
        await tx.insert(commissionRules).values(practicesToFreeze.map((practiceId) => ({
          id: `LEAD:${practiceId}`,
          scope: "LEAD",
          entityId: practiceId,
          amountCents: frozenTotalCents,
          updatedBy: actor.email,
          createdAt: now,
          updatedAt: now,
        }))).onConflictDoNothing();
      }

      await tx
        .delete(commissionRules)
        .where(and(eq(commissionRules.scope, "PARTNER_INCREMENT"), eq(commissionRules.entityId, id)));

      await tx
        .update(promotions)
        .set({ partnerId: targetPartner.id, updatedAt: now })
        .where(eq(promotions.id, id));

      await tx.insert(auditLogs).values({
        id: crypto.randomUUID(),
        actorEmail: actor.email,
        action: "PROMOTION_REASSIGNED",
        entityType: "promotion",
        entityId: id,
        payloadJson: JSON.stringify({
          offerNumber: promotion.offerNumber,
          fromPartnerId: currentPartner.id,
          fromPartner: partnerLabel(currentPartner),
          toPartnerId: targetPartner.id,
          toPartner: partnerLabel(targetPartner),
          baseCommissionCents: baseCents,
          previousPartnerIncrementCents: partnerIncrementCents,
          partnerIncrementReset: true,
          existingPractices: practiceIds.length,
          newlyFrozenPractices: practicesToFreeze.length,
          shopifyProductId: promotion.shopifyProductId,
          shopifyChanged: false,
        }),
      });

      await tx.insert(hubEvents).values({
        id: crypto.randomUUID(),
        eventType: "NOLEGGIO_PROMOTION_REASSIGNED",
        ecosystem: "ECCOMI_NOLEGGIO",
        entityType: "promotion",
        entityId: id,
        title: `${promotion.brand} ${promotion.model} riassegnata: ${partnerLabel(currentPartner)} → ${partnerLabel(targetPartner)}`,
        payloadJson: JSON.stringify({
          offerNumber: promotion.offerNumber,
          fromPartnerId: currentPartner.id,
          toPartnerId: targetPartner.id,
          partnerIncrementReset: true,
          existingPracticesFrozen: true,
          shopifyChanged: false,
        }),
        actorEmail: actor.email,
        createdAt: now,
      });
    });

    return Response.json({
      ok: true,
      preview: false,
      promotionId: id,
      fromPartnerId: currentPartner.id,
      fromPartner: partnerLabel(currentPartner),
      toPartnerId: targetPartner.id,
      toPartner: partnerLabel(targetPartner),
      baseCommissionCents: baseCents,
      previousPartnerIncrementCents: partnerIncrementCents,
      partnerIncrementReset: true,
      existingPractices: practiceIds.length,
      newlyFrozenPractices: practicesToFreeze.length,
      existingPracticesReassigned: false,
      shopifyChanged: false,
    });
  } catch (error) {
    return routeError(error);
  }
}
