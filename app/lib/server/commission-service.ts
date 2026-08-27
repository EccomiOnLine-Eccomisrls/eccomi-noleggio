import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { commissionRules } from "../../../db/commission-rules";
import { leads, partners, promotions } from "../../../db/schema";
import { isInternalEccomiPartner } from "../partner-identity";
import { ensurePracticeSchema } from "./practice-schema";

export type EccomiCommissionSource = "LEAD_SNAPSHOT" | "PROMOTION" | "INTERNAL_ECCOMI" | "UNCONFIGURED";

export type EccomiCommissionResolution = {
  configured: boolean;
  amountCents: number | null;
  source: EccomiCommissionSource;
  partnerId: string;
  promotionId: string;
  leadId: string;
};

function cleanId(value: string) {
  const id = value.trim();
  if (!id) throw new Error("Identificativo provvigione mancante.");
  return id;
}

function cleanAmount(value: number) {
  if (!Number.isInteger(value) || value < 0 || value > 10_000_000) {
    throw new Error("Importo provvigione ECCOMI non valido.");
  }
  return value;
}

function termId(scope: "PROMOTION" | "LEAD", entityId: string) {
  return `${scope}:${entityId}`;
}

async function getTerm(scope: "PROMOTION" | "LEAD", entityId: string) {
  await ensurePracticeSchema();
  const id = cleanId(entityId);
  const [row] = await getDb()
    .select({ amountCents: commissionRules.amountCents })
    .from(commissionRules)
    .where(and(eq(commissionRules.scope, scope), eq(commissionRules.entityId, id)))
    .limit(1);
  return row?.amountCents ?? null;
}

async function setTerm(
  scope: "PROMOTION" | "LEAD",
  entityId: string,
  amountCents: number,
  actorEmail: string,
) {
  await ensurePracticeSchema();
  const id = cleanId(entityId);
  const amount = cleanAmount(amountCents);
  const now = new Date().toISOString();
  await getDb()
    .insert(commissionRules)
    .values({
      id: termId(scope, id),
      scope,
      entityId: id,
      amountCents: amount,
      updatedBy: actorEmail,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: commissionRules.id,
      set: { amountCents: amount, updatedBy: actorEmail, updatedAt: now },
    });
  return amount;
}

export async function getPromotionEccomiCommission(promotionId: string) {
  return getTerm("PROMOTION", promotionId);
}

export async function setPromotionEccomiCommission(
  promotionId: string,
  amountCents: number,
  actorEmail: string,
) {
  return setTerm("PROMOTION", promotionId, amountCents, actorEmail);
}

export async function getLeadEccomiCommissionSnapshot(leadId: string) {
  return getTerm("LEAD", leadId);
}

export async function snapshotEccomiCommissionForLead(input: {
  leadId: string;
  promotionId: string;
  actorEmail?: string;
}) {
  const existing = await getLeadEccomiCommissionSnapshot(input.leadId);
  if (existing !== null) return existing;
  const offerAmount = await getPromotionEccomiCommission(input.promotionId);
  if (offerAmount === null) return null;
  return setTerm("LEAD", input.leadId, offerAmount, input.actorEmail || "system@eccomi.local");
}

export async function resolveEccomiCommissionForLead(leadId: string): Promise<EccomiCommissionResolution | null> {
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

  const snapshot = await getLeadEccomiCommissionSnapshot(row.leadId);
  if (snapshot !== null) {
    return { configured: true, amountCents: snapshot, source: "LEAD_SNAPSHOT", ...row };
  }

  const promotionAmount = await getPromotionEccomiCommission(row.promotionId);
  if (promotionAmount !== null) {
    const frozen = await snapshotEccomiCommissionForLead({
      leadId: row.leadId,
      promotionId: row.promotionId,
      actorEmail: "system-contract@eccomi.local",
    });
    return { configured: true, amountCents: frozen, source: "PROMOTION", ...row };
  }

  if (isInternalEccomiPartner({ name: row.partnerName, legalName: row.partnerLegalName })) {
    return { configured: true, amountCents: 0, source: "INTERNAL_ECCOMI", ...row };
  }

  return { configured: false, amountCents: null, source: "UNCONFIGURED", ...row };
}

export function eccomiCommissionSourceLabel(source: EccomiCommissionSource) {
  if (source === "LEAD_SNAPSHOT") return "Importo congelato nella pratica";
  if (source === "PROMOTION") return "Provvigione dell'offerta";
  if (source === "INTERNAL_ECCOMI") return "Struttura interna ECCOMI";
  return "Provvigione non configurata";
}
