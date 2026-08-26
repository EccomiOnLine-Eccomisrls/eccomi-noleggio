import { and, asc, eq, inArray, lte, ne } from "drizzle-orm";
import { getDb } from "../../../db";
import { partners, promotions } from "../../../db/schema";
import { isPartnerNoleggioRole } from "../permissions";
import type { Actor } from "./authz";

export const promotionStatuses = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "ONLINE",
  "ACTIVE",
  "EXPIRING",
  "EXPIRED",
  "SUSPENDED",
  "ARCHIVED",
  "TRASHED",
] as const;

export type PromotionStatus = (typeof promotionStatuses)[number];

const euro = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
const dateFormatter = new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "short", year: "numeric", timeZone: "Europe/Rome" });

function parseJsonArray(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function moneyToCents(value: string) {
  const normalized = value.replace(/\s/g, "").replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
}

export function integerFromText(value: string) {
  const parsed = Number(value.replace(/\D/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function italianDateToIso(value: string) {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return "";
  return `${match[3]}-${match[2]}-${match[1]}`;
}

export function daysUntil(value: string) {
  const end = new Date(`${value}T23:59:59+02:00`).getTime();
  return Math.max(0, Math.ceil((end - Date.now()) / 86_400_000));
}

export function statusLabel(status: string) {
  return ({
    DRAFT: "BOZZA",
    PENDING_APPROVAL: "DA APPROVARE",
    APPROVED: "APPROVATA",
    ONLINE: "ONLINE",
    ACTIVE: "ONLINE",
    EXPIRING: "IN SCADENZA",
    EXPIRED: "SCADUTA",
    SUSPENDED: "SOSPESA",
    ARCHIVED: "ARCHIVIATA",
    TRASHED: "NEL CESTINO",
  } as Record<string, string>)[status] || status;
}

export async function expireStalePromotions() {
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
  await getDb()
    .update(promotions)
    .set({ status: "EXPIRED", updatedAt: new Date().toISOString() })
    .where(and(
      lte(promotions.validUntil, today),
      inArray(promotions.status, ["PENDING_APPROVAL", "APPROVED", "ONLINE", "ACTIVE", "EXPIRING", "SUSPENDED"]),
    ));
}

function actorFilter(actor: Actor, includeTrash: boolean) {
  const partnerFilter = isPartnerNoleggioRole(actor.role) && actor.partnerId
    ? eq(promotions.partnerId, actor.partnerId)
    : undefined;
  const trashFilter = includeTrash
    ? eq(promotions.status, "TRASHED")
    : ne(promotions.status, "TRASHED");
  return partnerFilter ? and(partnerFilter, trashFilter) : trashFilter;
}

export async function listPromotionsForActor(actor: Actor, includeTrash = false) {
  const db = getDb();
  const rows = await db
    .select({ promotion: promotions, partnerName: partners.name })
    .from(promotions)
    .innerJoin(partners, eq(promotions.partnerId, partners.id))
    .where(actorFilter(actor, includeTrash))
    .orderBy(asc(promotions.validUntil), asc(promotions.createdAt));

  return rows.map(({ promotion, partnerName }) => ({
    id: promotion.id,
    offerNumber: promotion.offerNumber,
    brand: promotion.brand,
    model: promotion.model,
    owner: promotion.partnerId === "eccomi-direct" ? "ECCOMI diretto" : partnerName,
    source: promotion.sourceLabel,
    rental: promotion.provider,
    price: euro.format(promotion.monthlyGrossCents / 100),
    deposit: euro.format(promotion.depositGrossCents / 100),
    term: `${promotion.durationMonths} mesi`,
    mileage: `${promotion.totalKm.toLocaleString("it-IT")} km`,
    expires: dateFormatter.format(new Date(`${promotion.validUntil}T12:00:00Z`)).replace(" ", " "),
    validUntil: promotion.validUntil,
    days: `${daysUntil(promotion.validUntil)} giorni`,
    image: promotion.coverKey === "asset:/offers/kia-picanto.png"
      ? "/offers/kia-picanto.png"
      : promotion.coverKey
        ? `/api/promotions/${promotion.id}/cover`
        : null,
    accent: promotion.brand.toUpperCase() === "FIAT" ? "yellow" : "blue",
    version: promotion.version,
    fuel: promotion.fuel,
    transmission: promotion.transmission,
    color: promotion.color,
    delivery: promotion.delivery,
    services: parseJsonArray(promotion.servicesJson),
    warnings: parseJsonArray(promotion.warningsJson),
    status: promotion.status as PromotionStatus,
    statusLabel: statusLabel(promotion.status),
    quoteStored: Boolean(promotion.quoteKey),
    shopifyProductId: promotion.shopifyProductId,
    shopifyPrepared: Boolean(promotion.shopifyProductId),
    shopifyUrl: promotion.shopifyUrl,
    shopifyCollectionId: promotion.shopifyCollectionId,
    automationStatus: promotion.automationStatus,
    automationError: promotion.automationError,
    extractionMethod: promotion.extractionMethod,
    coverSourceKind: promotion.coverSourceKind,
    coverAttribution: promotion.coverAttribution,
    updatedAt: promotion.updatedAt,
  }));
}
