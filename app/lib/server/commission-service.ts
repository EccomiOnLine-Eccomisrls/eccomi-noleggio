import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { commissionRules } from "../../../db/commission-rules";
import { leads, partners, promotions } from "../../../db/schema";
import { isInternalEccomiPartner } from "../partner-identity";
import { ensurePracticeSchema } from "./practice-schema";

export type CommissionRuleScope = "PARTNER" | "PROMOTION" | "LEAD";
export type CommissionResolutionSource = CommissionRuleScope | "INTERNAL_ECCOMI" | "UNCONFIGURED";

export type CommissionResolution = {
  configured: boolean;
  amountCents: number | null;
  source: CommissionResolutionSource;
  partnerId: string;
  promotionId: string;
  leadId: string;
};

function ruleId(scope: CommissionRuleScope, entityId: string) {
  return `${scope}:${entityId}`;
}

function cleanEntityId(value: string) {
  const entityId = value.trim();
  if (!entityId) throw new Error("Identificativo commissione mancante.");
  return entityId;
}

function cleanAmountCents(value: number) {
  if (!Number.isInteger(value) || value < 0 || value > 10_000_000) {
    throw new Error("Importo commissione non valido.");
  }
  return value;
}

export async function getCommissionRule(scope: CommissionRuleScope, entityId: string) {
  await ensurePracticeSchema();
  const id = cleanEntityId(entityId);
  const [rule] = await getDb()
    .select({ amountCents: commissionRules.amountCents })
    .from(commissionRules)
    .where(and(eq(commissionRules.scope, scope), eq(commissionRules.entityId, id)))
    .limit(1);
  return rule?.amountCents ?? null;
}

export async function setCommissionRule(
  scope: CommissionRuleScope,
  entityId: string,
  amountCents: number,
  actorEmail: string,
) {
  await ensurePracticeSchema();
  const id = cleanEntityId(entityId);
  const amount = cleanAmountCents(amountCents);
  const now = new Date().toISOString();

  await getDb()
    .insert(commissionRules)
    .values({
      id: ruleId(scope, id),
      scope,
      entityId: id,
      amountCents: amount,
      updatedBy: actorEmail,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: commissionRules.id,
      set: {
        amountCents: amount,
        updatedBy: actorEmail,
        updatedAt: now,
      },
    });

  return amount;
}

export async function clearCommissionRule(scope: CommissionRuleScope, entityId: string) {
  await ensurePracticeSchema();
  const id = cleanEntityId(entityId);
  await getDb()
    .delete(commissionRules)
    .where(and(eq(commissionRules.scope, scope), eq(commissionRules.entityId, id)));
}

export async function resolveCommissionForLead(leadId: string): Promise<CommissionResolution | null> {
  await ensurePracticeSchema();
  const db = getDb();
  const [row] = await db
    .select({
      leadId: leads.id,
      promotionId: leads.promotionId,
      partnerId: leads.partnerId,
      partnerName: partners.name,
      partnerLegalName: partners.legalName,
    })
    .from(leads)
    .innerJoin(promotions, eq(leads.promotionId, promotions.id))
    .innerJoin(partners, eq(leads.partnerId, partners.id))
    .where(eq(leads.id, leadId))
    .limit(1);

  if (!row) return null;

  const [leadRule, promotionRule, partnerRule] = await Promise.all([
    getCommissionRule("LEAD", row.leadId),
    getCommissionRule("PROMOTION", row.promotionId),
    getCommissionRule("PARTNER", row.partnerId),
  ]);

  if (leadRule !== null) {
    return { configured: true, amountCents: leadRule, source: "LEAD", leadId: row.leadId, promotionId: row.promotionId, partnerId: row.partnerId };
  }
  if (promotionRule !== null) {
    return { configured: true, amountCents: promotionRule, source: "PROMOTION", leadId: row.leadId, promotionId: row.promotionId, partnerId: row.partnerId };
  }
  if (partnerRule !== null) {
    return { configured: true, amountCents: partnerRule, source: "PARTNER", leadId: row.leadId, promotionId: row.promotionId, partnerId: row.partnerId };
  }
  if (isInternalEccomiPartner({ name: row.partnerName, legalName: row.partnerLegalName })) {
    return { configured: true, amountCents: 0, source: "INTERNAL_ECCOMI", leadId: row.leadId, promotionId: row.promotionId, partnerId: row.partnerId };
  }

  return { configured: false, amountCents: null, source: "UNCONFIGURED", leadId: row.leadId, promotionId: row.promotionId, partnerId: row.partnerId };
}

export function commissionSourceLabel(source: CommissionResolutionSource) {
  if (source === "LEAD") return "Override pratica";
  if (source === "PROMOTION") return "Override offerta";
  if (source === "PARTNER") return "Commissione base Partner";
  if (source === "INTERNAL_ECCOMI") return "Struttura interna ECCOMI";
  return "Non configurata";
}
