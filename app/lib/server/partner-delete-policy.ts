import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { commissions, leads, partners, promotions, users } from "../../../db/schema";
import { isInternalEccomiPartner } from "./partner-control-rules";

export type PartnerDeleteBlockers = {
  offers: number;
  practices: number;
  users: number;
  commissions: number;
};

export type PartnerDeleteState = {
  partner: {
    id: string;
    name: string;
    legalName: string;
  };
  internalEccomi: boolean;
  blockers: PartnerDeleteBlockers;
  canDelete: boolean;
};

function previewState(id: string): PartnerDeleteState | null {
  if (id === "preview-empty-test") {
    return {
      partner: { id, name: "Eccomi OnLine Test", legalName: "Eccomi OnLine Test S.r.l." },
      internalEccomi: false,
      blockers: { offers: 0, practices: 0, users: 0, commissions: 0 },
      canDelete: true,
    };
  }

  if (id === "preview-goal-rent") {
    return {
      partner: { id, name: "Goal Rent SRL", legalName: "Goal Rent SRL" },
      internalEccomi: false,
      blockers: { offers: 18, practices: 0, users: 0, commissions: 0 },
      canDelete: false,
    };
  }

  if (id === "eccomi-direct") {
    return {
      partner: { id, name: "ECCOMI", legalName: "ECCOMI SRLS" },
      internalEccomi: true,
      blockers: { offers: 4, practices: 1, users: 0, commissions: 0 },
      canDelete: false,
    };
  }

  return null;
}

export async function getPartnerDeleteState(id: string, preview = false): Promise<PartnerDeleteState | null> {
  if (preview) return previewState(id);

  const db = getDb();
  const [partner] = await db
    .select({ id: partners.id, name: partners.name, legalName: partners.legalName })
    .from(partners)
    .where(eq(partners.id, id))
    .limit(1);
  if (!partner) return null;

  const [offerRows, practiceRows, userRows, commissionRows] = await Promise.all([
    db.select({ id: promotions.id }).from(promotions).where(eq(promotions.partnerId, id)),
    db.select({ id: leads.id }).from(leads).where(eq(leads.partnerId, id)),
    db.select({ email: users.email }).from(users).where(eq(users.partnerId, id)),
    db.select({ id: commissions.id }).from(commissions).where(eq(commissions.partnerId, id)),
  ]);

  const internalEccomi = id === "eccomi-direct" || isInternalEccomiPartner(partner.name, partner.legalName);
  const blockers = {
    offers: offerRows.length,
    practices: practiceRows.length,
    users: userRows.length,
    commissions: commissionRows.length,
  };
  const hasLinks = Object.values(blockers).some((count) => count > 0);

  return {
    partner,
    internalEccomi,
    blockers,
    canDelete: !internalEccomi && !hasLinks,
  };
}
