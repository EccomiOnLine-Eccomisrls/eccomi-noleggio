import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "../../../db";
import { commissions, leads, partners, practiceDocuments, promotions, users } from "../../../db/schema";
import { isRenderPullRequestPreview } from "./preview-mode";

const CLOSED_PRACTICE_STATUSES = new Set(["DELIVERED", "ARCHIVED"]);
const PARTNER_STAGE_STATUSES = new Set(["SENT_TO_PARTNER", "PARTNER_REVIEW", "NEEDS_INFO", "QUOTE", "CONTRACT"]);
const ONLINE_PROMOTION_STATUSES = new Set(["ONLINE", "ACTIVE", "EXPIRING"]);
const SLA_ATTENTION_HOURS = 24;

export type PartnerHealth = "REGULAR" | "ATTENTION" | "INTERVENTION";

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
  stalePractices: number;
  commissionCents: number;
  lastActivityAt: string | null;
  health: PartnerHealth;
  healthReason: string;
};

export type CeoPartnerOverview = {
  preview: boolean;
  stats: {
    partners: number;
    activePartners: number;
    practices: number;
    openPractices: number;
    attentionPartners: number;
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
    lastAccessAt: string | null;
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
    slaHours: number;
    stale: boolean;
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

export type CeoPracticeDetail = {
  preview: boolean;
  practice: {
    id: string;
    customerName: string;
    email: string;
    phone: string;
    province: string | null;
    customerType: string | null;
    status: string;
    documentStatus: string;
    createdAt: string;
    updatedAt: string;
    sentToPartnerAt: string | null;
    completedAt: string | null;
    slaHours: number;
    stale: boolean;
  };
  partner: {
    id: string;
    name: string;
    legalName: string;
    contactName: string | null;
    contactEmail: string | null;
  };
  promotion: {
    id: string;
    offerNumber: string;
    brand: string;
    model: string;
    version: string;
  };
  documents: Array<{
    id: string;
    documentType: string;
    originalName: string;
    status: string;
    createdAt: string;
  }>;
};

function maxDate(values: Array<string | null | undefined>) {
  const filtered = values.filter((value): value is string => Boolean(value));
  if (!filtered.length) return null;
  return filtered.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || null;
}

function hoursSince(value: string | null | undefined) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return 0;
  return Math.max(0, Math.floor((Date.now() - time) / 3600000));
}

function practiceIsStale(row: { status: string; updatedAt: string; sentToPartnerAt?: string | null }) {
  if (CLOSED_PRACTICE_STATUSES.has(row.status)) return false;
  const inPartnerStage = Boolean(row.sentToPartnerAt) || PARTNER_STAGE_STATUSES.has(row.status);
  return inPartnerStage && hoursSince(row.updatedAt) >= SLA_ATTENTION_HOURS;
}

function partnerHealth(status: string, openPractices: number, stalePractices: number, activeUsers: number) {
  if (status === "ACTIVE" && openPractices > 0 && activeUsers === 0) {
    return {
      health: "INTERVENTION" as const,
      reason: "Pratiche aperte senza account partner attivi",
    };
  }
  if (stalePractices >= 2) {
    return {
      health: "INTERVENTION" as const,
      reason: `${stalePractices} pratiche ferme oltre 24 ore`,
    };
  }
  if (stalePractices === 1) {
    return {
      health: "ATTENTION" as const,
      reason: "1 pratica ferma oltre 24 ore",
    };
  }
  if (status !== "ACTIVE") {
    return {
      health: "ATTENTION" as const,
      reason: status === "PAUSED" ? "Partner attualmente in pausa" : "Partner non operativo",
    };
  }
  return {
    health: "REGULAR" as const,
    reason: "Nessuna anomalia operativa rilevata",
  };
}

function makePreviewPartner(input: Omit<CeoPartnerSummary, "health" | "healthReason">): CeoPartnerSummary {
  const health = partnerHealth(input.status, input.openPractices, input.stalePractices, input.activeUsers);
  return { ...input, health: health.health, healthReason: health.reason };
}

function previewOverview(): CeoPartnerOverview {
  const now = Date.now();
  const isoAgo = (hours: number) => new Date(now - hours * 3600000).toISOString();
  const partnersPreview: CeoPartnerSummary[] = [
    makePreviewPartner({
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
      stalePractices: 0,
      commissionCents: 148000,
      lastActivityAt: isoAgo(1),
    }),
    makePreviewPartner({
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
      stalePractices: 1,
      commissionCents: 82000,
      lastActivityAt: isoAgo(30),
    }),
    makePreviewPartner({
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
      stalePractices: 0,
      commissionCents: 23000,
      lastActivityAt: isoAgo(240),
    }),
  ];

  return {
    preview: true,
    stats: {
      partners: partnersPreview.length,
      activePartners: partnersPreview.filter((partner) => partner.status === "ACTIVE").length,
      practices: partnersPreview.reduce((sum, partner) => sum + partner.practices, 0),
      openPractices: partnersPreview.reduce((sum, partner) => sum + partner.openPractices, 0),
      attentionPartners: partnersPreview.filter((partner) => partner.health !== "REGULAR").length,
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
      sentToPartnerAt: leads.sentToPartnerAt,
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
    const stalePractices = openPractices.filter(practiceIsStale).length;
    const activeUsers = partnerUsers.filter((row) => row.active).length;
    const health = partnerHealth(partner.status, openPractices.length, stalePractices, activeUsers);

    return {
      id: partner.id,
      name: partner.name,
      legalName: partner.legalName,
      status: partner.status,
      contactName: partner.contactName,
      contactEmail: partner.contactEmail,
      activeUsers,
      promotions: partnerPromotions.length,
      onlinePromotions: partnerPromotions.filter((row) => ONLINE_PROMOTION_STATUSES.has(row.status)).length,
      practices: partnerPractices.length,
      openPractices: openPractices.length,
      completedPractices: partnerPractices.length - openPractices.length,
      stalePractices,
      commissionCents: partnerCommissions.reduce((sum, row) => sum + row.amountCents, 0),
      lastActivityAt: maxDate([
        partner.updatedAt,
        ...partnerPromotions.map((row) => row.updatedAt),
        ...partnerPractices.map((row) => row.updatedAt),
        ...partnerCommissions.map((row) => row.updatedAt),
        ...partnerUsers.map((row) => row.updatedAt),
      ]),
      health: health.health,
      healthReason: health.reason,
    };
  });

  return {
    preview: false,
    stats: {
      partners: summaries.length,
      activePartners: summaries.filter((partner) => partner.status === "ACTIVE").length,
      practices: summaries.reduce((sum, partner) => sum + partner.practices, 0),
      openPractices: summaries.reduce((sum, partner) => sum + partner.openPractices, 0),
      attentionPartners: summaries.filter((partner) => partner.health !== "REGULAR").length,
      commissionCents: summaries.reduce((sum, partner) => sum + partner.commissionCents, 0),
    },
    partners: summaries,
  };
}

function previewDetail(id: string): CeoPartnerDetail | null {
  const overview = previewOverview();
  const partner = overview.partners.find((item) => item.id === id);
  if (!partner) return null;
  const now = Date.now();
  const isoAgo = (hours: number) => new Date(now - hours * 3600000).toISOString();
  const staleHours = partner.stalePractices ? 30 : 2;

  return {
    preview: true,
    partner,
    users: Array.from({ length: partner.activeUsers }, (_, index) => ({
      email: index === 0
        ? (partner.contactEmail || "partner.preview@eccomi.local")
        : `operatore${index + 1}.${partner.id.replace(/^preview-/, "")}@eccomi.local`,
      displayName: index === 0
        ? (partner.contactName || partner.name)
        : `Operatore Demo ${index + 1}`,
      active: true,
      lastAccessAt: index === 0 ? partner.lastActivityAt : isoAgo(index + 1),
    })),
    promotions: [
      { id: "preview-promo-1", offerNumber: "PREVIEW-3008", brand: "PEUGEOT", model: "3008", version: "Hybrid 145 Allure Business", status: partner.onlinePromotions ? "ONLINE" : "ARCHIVED", validUntil: "2026-09-30" },
      { id: "preview-promo-2", offerNumber: "PREVIEW-YPSILON", brand: "LANCIA", model: "Ypsilon", version: "Ibrida e-DCT", status: partner.onlinePromotions > 1 ? "ONLINE" : "ARCHIVED", validUntil: "2026-10-15" },
    ],
    practices: partner.practices
      ? [
          {
            id: `PRATICA-${id.toUpperCase()}-001`,
            customerName: "Cliente Demo",
            status: partner.openPractices ? "PARTNER_REVIEW" : "DELIVERED",
            documentStatus: "COMPLETE",
            vehicle: "PEUGEOT 3008",
            offerNumber: "PREVIEW-3008",
            createdAt: isoAgo(72),
            updatedAt: isoAgo(staleHours),
            sentToPartnerAt: isoAgo(60),
            completedAt: partner.openPractices ? null : isoAgo(12),
            slaHours: staleHours,
            stale: staleHours >= SLA_ATTENTION_HOURS && partner.openPractices > 0,
          },
          {
            id: `PRATICA-${id.toUpperCase()}-002`,
            customerName: "Cliente Demo 2",
            status: "DELIVERED",
            documentStatus: "COMPLETE",
            vehicle: "LANCIA Ypsilon",
            offerNumber: "PREVIEW-YPSILON",
            createdAt: isoAgo(120),
            updatedAt: isoAgo(4),
            sentToPartnerAt: isoAgo(110),
            completedAt: isoAgo(4),
            slaHours: 4,
            stale: false,
          },
        ]
      : [],
    commissions: partner.commissionCents
      ? [{ id: "COMMISSIONE-PREVIEW-001", leadId: `PRATICA-${id.toUpperCase()}-002`, amountCents: partner.commissionCents, status: "ACCRUED", accruedAt: isoAgo(4), invoicedAt: null, paidAt: null }]
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
      updatedAt: users.updatedAt,
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
    .where(and(eq(leads.partnerId, id), isNull(leads.deletedAt)))
    .orderBy(desc(leads.updatedAt))
    .limit(250);

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
    users: userRows.map((row) => ({
      email: row.email,
      displayName: row.displayName,
      active: row.active,
      lastAccessAt: row.updatedAt,
    })),
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
      slaHours: hoursSince(row.updatedAt),
      stale: practiceIsStale(row),
    })),
    commissions: commissionRows,
  };
}

export async function getCeoPracticeDetail(request: Request, id: string): Promise<CeoPracticeDetail | null> {
  if (isRenderPullRequestPreview(request)) {
    const overview = previewOverview();
    for (const partner of overview.partners) {
      const detail = previewDetail(partner.id);
      const practice = detail?.practices.find((item) => item.id === id);
      if (!detail || !practice) continue;
      const promotion = detail.promotions.find((item) => item.offerNumber === practice.offerNumber);
      return {
        preview: true,
        practice: {
          id: practice.id,
          customerName: practice.customerName,
          email: "cliente.preview@eccomi.local",
          phone: "+39 333 0000000",
          province: "RM",
          customerType: "Privato",
          status: practice.status,
          documentStatus: practice.documentStatus,
          createdAt: practice.createdAt,
          updatedAt: practice.updatedAt,
          sentToPartnerAt: practice.sentToPartnerAt,
          completedAt: practice.completedAt,
          slaHours: practice.slaHours,
          stale: practice.stale,
        },
        partner: {
          id: detail.partner.id,
          name: detail.partner.name,
          legalName: detail.partner.legalName,
          contactName: detail.partner.contactName,
          contactEmail: detail.partner.contactEmail,
        },
        promotion: {
          id: promotion?.id || "preview-promo-1",
          offerNumber: practice.offerNumber,
          brand: promotion?.brand || practice.vehicle.split(" ")[0] || "AUTO",
          model: promotion?.model || practice.vehicle.split(" ").slice(1).join(" "),
          version: promotion?.version || "Versione demo",
        },
        documents: [
          { id: "preview-doc-1", documentType: "DOCUMENTO_IDENTITA", originalName: "documento-demo.pdf", status: "UPLOADED", createdAt: practice.createdAt },
        ],
      };
    }
    return null;
  }

  const db = getDb();
  const [row] = await db
    .select({
      id: leads.id,
      firstName: leads.firstName,
      lastName: leads.lastName,
      email: leads.email,
      phone: leads.phone,
      province: leads.province,
      customerType: leads.customerType,
      status: leads.status,
      documentStatus: leads.documentStatus,
      createdAt: leads.createdAt,
      updatedAt: leads.updatedAt,
      sentToPartnerAt: leads.sentToPartnerAt,
      completedAt: leads.completedAt,
      partnerId: partners.id,
      partnerName: partners.name,
      partnerLegalName: partners.legalName,
      partnerContactName: partners.contactName,
      partnerContactEmail: partners.contactEmail,
      promotionId: promotions.id,
      offerNumber: promotions.offerNumber,
      brand: promotions.brand,
      model: promotions.model,
      version: promotions.version,
    })
    .from(leads)
    .innerJoin(partners, eq(leads.partnerId, partners.id))
    .innerJoin(promotions, eq(leads.promotionId, promotions.id))
    .where(and(eq(leads.id, id), isNull(leads.deletedAt)))
    .limit(1);

  if (!row) return null;

  const documents = await db
    .select({
      id: practiceDocuments.id,
      documentType: practiceDocuments.documentType,
      originalName: practiceDocuments.originalName,
      status: practiceDocuments.status,
      createdAt: practiceDocuments.createdAt,
    })
    .from(practiceDocuments)
    .where(eq(practiceDocuments.leadId, id))
    .orderBy(desc(practiceDocuments.createdAt));

  return {
    preview: false,
    practice: {
      id: row.id,
      customerName: `${row.firstName} ${row.lastName}`.trim(),
      email: row.email,
      phone: row.phone,
      province: row.province,
      customerType: row.customerType,
      status: row.status,
      documentStatus: row.documentStatus,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      sentToPartnerAt: row.sentToPartnerAt,
      completedAt: row.completedAt,
      slaHours: hoursSince(row.updatedAt),
      stale: practiceIsStale(row),
    },
    partner: {
      id: row.partnerId,
      name: row.partnerName,
      legalName: row.partnerLegalName,
      contactName: row.partnerContactName,
      contactEmail: row.partnerContactEmail,
    },
    promotion: {
      id: row.promotionId,
      offerNumber: row.offerNumber,
      brand: row.brand,
      model: row.model,
      version: row.version,
    },
    documents,
  };
}
