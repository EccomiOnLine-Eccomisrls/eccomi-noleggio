import { asc, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "../../../db";
import { commissions, leads, partners, promotions, users } from "../../../db/schema";
import { isRenderPullRequestPreview } from "./preview-mode";

const CLOSED_PRACTICE_STATUSES = new Set(["DELIVERED", "ARCHIVED"]);
const ONLINE_PROMOTION_STATUSES = new Set(["ONLINE", "ACTIVE", "EXPIRING"]);

export type CeoPartnerSummary = {
  id: string;
  name: string;
  legalName: string;
  status: string;
  contactName: string | null;
  contactEmail: string | null;
  activeUsers: number;
  promotions: number;
  onlinePromotions: number;
  practices: number;
  openPractices: number;
  completedPractices: number;
  commissionCents: number;
  lastActivityAt: string | null;
};

export type CeoPartnerOverview = {
  preview: boolean;
  stats: {
    partners: number;
    activePartners: number;
    practices: number;
    openPractices: number;
    partnersWithOpenPractices: number;
    commissionCents: number;
  };
  partners: CeoPartnerSummary[];
};

export type CeoPartnerDetail = {
  preview: boolean;
  partner: CeoPartnerSummary;
  users: Array<{
    email: string;
    displayName: string;
    active: boolean;
  }>;
  promotions: Array<{
    id: string;
    offerNumber: string;
    brand: string;
    model: string;
    version: string;
    status: string;
    validUntil: string;
  }>;
  practices: Array<{
    id: string;
    customerName: string;
    status: string;
    documentStatus: string;
    vehicle: string;
    offerNumber: string;
    createdAt: string;
    updatedAt: string;
    sentToPartnerAt: string | null;
    completedAt: string | null;
  }>;
  commissions: Array<{
    id: string;
    leadId: string;
    amountCents: number;
    status: string;
    accruedAt: string;
    invoicedAt: string | null;
    paidAt: string | null;
  }>;
};

function maxDate(values: Array<string | null | undefined>) {
  const filtered = values.filter((value): value is string => Boolean(value));
  if (!filtered.length) return null;
  return filtered.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || null;
}

function previewOverview(): CeoPartnerOverview {
  const now = new Date().toISOString();
  const partnersPreview: CeoPartnerSummary[] = [
    {
      id: "preview-goal-rent",
      name: "GOAL RENT",
      legalName: "Goal Rent S.r.l.",
      status: "ACTIVE",
      contactName: "Mario Rossi",
      contactEmail: "partner.preview@eccomi.local",
      activeUsers: 1,
      promotions: 7,
      onlinePromotions: 5,
      practices: 8,
      openPractices: 5,
      completedPractices: 3,
      commissionCents: 148000,
      lastActivityAt: now,
    },
    {
      id: "preview-mobility-one",
      name: "MOBILITY ONE",
      legalName: "Mobility One S.r.l.",
      status: "ACTIVE",
      contactName: "Laura Bianchi",
      contactEmail: "mobility.preview@eccomi.local",
      activeUsers: 2,
      promotions: 4,
      onlinePromotions: 3,
      practices: 4,
      openPractices: 2,
      completedPractices: 2,
      commissionCents: 82000,
      lastActivityAt: now,
    },
    {
      id: "preview-rent-network",
      name: "RENT NETWORK",
      legalName: "Rent Network Italia S.r.l.",
      status: "PAUSED",
      contactName: "Giulia Verdi",
      contactEmail: "network.preview@eccomi.local",
      activeUsers: 0,
      promotions: 2,
      onlinePromotions: 0,
      practices: 1,
      openPractices: 0,
      completedPractices: 1,
      commissionCents: 23000,
      lastActivityAt: now,
    },
  ];

  return {
    preview: true,
    stats: {
      partners: partnersPreview.length,
      activePartners: partnersPreview.filter((partner) => partner.status === "ACTIVE").length,
      practices: partnersPreview.reduce((sum, partner) => sum + partner.practices, 0),
      openPractices: partnersPreview.reduce((sum, partner) => sum + partner.openPractices, 0),
      partnersWithOpenPractices: partnersPreview.filter((partner) => partner.openPractices > 0).length,
      commissionCents: partnersPreview.reduce((sum, partner) => sum + partner.commissionCents, 0),
    },
    partners: partnersPreview,
  };
}

export async function getCeoPartnerOverview(request: Request): Promise<CeoPartnerOverview> {
  if (isRenderPullRequestPreview(request)) return previewOverview();

  const db = getDb();
  const partnerRows = await db
    .select({
      id: partners.id,
      name: partners.name,
      legalName: partners.legalName,
      status: partners.status,
      contactName: partners.contactName,
      contactEmail: partners.contactEmail,
      updatedAt: partners.updatedAt,
    })
    .from(partners)
    .orderBy(asc(partners.name));

  const promotionRows = await db
    .select({
      partnerId: promotions.partnerId,
      status: promotions.status,
      updatedAt: promotions.updatedAt,
    })
    .from(promotions);

  const leadRows = await db
    .select({
      partnerId: leads.partnerId,
      status: leads.status,
      updatedAt: leads.updatedAt,
    })
    .from(leads)
    .where(isNull(leads.deletedAt));

  const commissionRows = await db
    .select({
      partnerId: commissions.partnerId,
      amountCents: commissions.amountCents,
      updatedAt: commissions.updatedAt,
    })
    .from(commissions);

  const userRows = await db
    .select({
      partnerId: users.partnerId,
      active: users.active,
      updatedAt: users.updatedAt,
    })
    .from(users);

  const summaries = partnerRows.map<CeoPartnerSummary>((partner) => {
    const partnerPromotions = promotionRows.filter((row) => row.partnerId === partner.id);
    const partnerPractices = leadRows.filter((row) => row.partnerId === partner.id);
    const partnerCommissions = commissionRows.filter((row) => row.partnerId === partner.id);
    const partnerUsers = userRows.filter((row) => row.partnerId === partner.id);
    const openPractices = partnerPractices.filter((row) => !CLOSED_PRACTICE_STATUSES.has(row.status));

    return {
      id: partner.id,
      name: partner.name,
      legalName: partner.legalName,
      status: partner.status,
      contactName: partner.contactName,
      contactEmail: partner.contactEmail,
      activeUsers: partnerUsers.filter((row) => row.active).length,
      promotions: partnerPromotions.length,
      onlinePromotions: partnerPromotions.filter((row) => ONLINE_PROMOTION_STATUSES.has(row.status)).length,
      practices: partnerPractices.length,
      openPractices: openPractices.length,
      completedPractices: partnerPractices.length - openPractices.length,
      commissionCents: partnerCommissions.reduce((sum, row) => sum + row.amountCents, 0),
      lastActivityAt: maxDate([
        partner.updatedAt,
        ...partnerPromotions.map((row) => row.updatedAt),
        ...partnerPractices.map((row) => row.updatedAt),
        ...partnerCommissions.map((row) => row.updatedAt),
        ...partnerUsers.map((row) => row.updatedAt),
      ]),
    };
  });

  return {
    preview: false,
    stats: {
      partners: summaries.length,
      activePartners: summaries.filter((partner) => partner.status === "ACTIVE").length,
      practices: summaries.reduce((sum, partner) => sum + partner.practices, 0),
      openPractices: summaries.reduce((sum, partner) => sum + partner.openPractices, 0),
      partnersWithOpenPractices: summaries.filter((partner) => partner.openPractices > 0).length,
      commissionCents: summaries.reduce((sum, partner) => sum + partner.commissionCents, 0),
    },
    partners: summaries,
  };
}

function previewDetail(id: string): CeoPartnerDetail | null {
  const overview = previewOverview();
  const partner = overview.partners.find((item) => item.id === id);
  if (!partner) return null;
  const now = new Date().toISOString();

  return {
    preview: true,
    partner,
    users: partner.activeUsers
      ? [{ email: partner.contactEmail || "partner.preview@eccomi.local", displayName: partner.contactName || partner.name, active: true }]
      : [],
    promotions: [
      { id: "preview-promo-1", offerNumber: "PREVIEW-3008", brand: "PEUGEOT", model: "3008", version: "Hybrid 145 Allure Business", status: partner.onlinePromotions ? "ONLINE" : "ARCHIVED", validUntil: "2026-09-30" },
      { id: "preview-promo-2", offerNumber: "PREVIEW-YPSILON", brand: "LANCIA", model: "Ypsilon", version: "Ibrida e-DCT", status: partner.onlinePromotions > 1 ? "ONLINE" : "ARCHIVED", validUntil: "2026-10-15" },
    ],
    practices: partner.practices
      ? [
          { id: "PRATICA-PREVIEW-001", customerName: "Cliente Demo", status: partner.openPractices ? "PARTNER_REVIEW" : "DELIVERED", documentStatus: "COMPLETE", vehicle: "PEUGEOT 3008", offerNumber: "PREVIEW-3008", createdAt: now, updatedAt: now, sentToPartnerAt: now, completedAt: partner.openPractices ? null : now },
          { id: "PRATICA-PREVIEW-002", customerName: "Cliente Demo 2", status: "DELIVERED", documentStatus: "COMPLETE", vehicle: "LANCIA Ypsilon", offerNumber: "PREVIEW-YPSILON", createdAt: now, updatedAt: now, sentToPartnerAt: now, completedAt: now },
        ]
      : [],
    commissions: partner.commissionCents
      ? [{ id: "COMMISSIONE-PREVIEW-001", leadId: "PRATICA-PREVIEW-002", amountCents: partner.commissionCents, status: "ACCRUED", accruedAt: now, invoicedAt: null, paidAt: null }]
      : [],
  };
}

export async function getCeoPartnerDetail(request: Request, id: string): Promise<CeoPartnerDetail | null> {
  if (isRenderPullRequestPreview(request)) return previewDetail(id);

  const db = getDb();
  const overview = await getCeoPartnerOverview(request);
  const partner = overview.partners.find((item) => item.id === id);
  if (!partner) return null;

  const userRows = await db
    .select({
      email: users.email,
      displayName: users.displayName,
      active: users.active,
    })
    .from(users)
    .where(eq(users.partnerId, id))
    .orderBy(asc(users.displayName));

  const promotionRows = await db
    .select({
      id: promotions.id,
      offerNumber: promotions.offerNumber,
      brand: promotions.brand,
      model: promotions.model,
      version: promotions.version,
      status: promotions.status,
      validUntil: promotions.validUntil,
    })
    .from(promotions)
    .where(eq(promotions.partnerId, id))
    .orderBy(desc(promotions.updatedAt));

  const practiceRows = await db
    .select({
      id: leads.id,
      firstName: leads.firstName,
      lastName: leads.lastName,
      status: leads.status,
      documentStatus: leads.documentStatus,
      createdAt: leads.createdAt,
      updatedAt: leads.updatedAt,
      sentToPartnerAt: leads.sentToPartnerAt,
      completedAt: leads.completedAt,
      brand: promotions.brand,
      model: promotions.model,
      offerNumber: promotions.offerNumber,
    })
    .from(leads)
    .innerJoin(promotions, eq(leads.promotionId, promotions.id))
    .where(eq(leads.partnerId, id))
    .orderBy(desc(leads.updatedAt))
    .limit(100);

  const commissionRows = await db
    .select({
      id: commissions.id,
      leadId: commissions.leadId,
      amountCents: commissions.amountCents,
      status: commissions.status,
      accruedAt: commissions.accruedAt,
      invoicedAt: commissions.invoicedAt,
      paidAt: commissions.paidAt,
    })
    .from(commissions)
    .where(eq(commissions.partnerId, id))
    .orderBy(desc(commissions.accruedAt));

  return {
    preview: false,
    partner,
    users: userRows,
    promotions: promotionRows,
    practices: practiceRows.map((row) => ({
      id: row.id,
      customerName: `${row.firstName} ${row.lastName}`.trim(),
      status: row.status,
      documentStatus: row.documentStatus,
      vehicle: `${row.brand} ${row.model}`.trim(),
      offerNumber: row.offerNumber,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      sentToPartnerAt: row.sentToPartnerAt,
      completedAt: row.completedAt,
    })),
    commissions: commissionRows,
  };
}
