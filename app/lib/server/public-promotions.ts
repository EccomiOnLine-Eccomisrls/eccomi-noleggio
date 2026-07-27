import { and, asc, gte, inArray } from "drizzle-orm";
import { getDb } from "../../../db";
import { promotions } from "../../../db/schema";

function parseJsonArray(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export async function listPublicPromotions() {
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
  const rows = await getDb()
    .select()
    .from(promotions)
    .where(and(
      inArray(promotions.status, ["ONLINE", "ACTIVE", "EXPIRING"]),
      gte(promotions.validUntil, today),
    ))
    .orderBy(asc(promotions.validUntil), asc(promotions.createdAt));

  return rows.map((promotion) => ({
    id: promotion.id,
    offerNumber: promotion.offerNumber,
    brand: promotion.brand,
    model: promotion.model,
    version: promotion.version,
    provider: promotion.provider,
    monthlyGrossCents: promotion.monthlyGrossCents,
    depositGrossCents: promotion.depositGrossCents,
    durationMonths: promotion.durationMonths,
    totalKm: promotion.totalKm,
    validUntil: promotion.validUntil,
    delivery: promotion.delivery,
    fuel: promotion.fuel,
    transmission: promotion.transmission,
    services: parseJsonArray(promotion.servicesJson),
    shopifyUrl: promotion.shopifyUrl,
    imageUrl: `/api/public/promotions/${encodeURIComponent(promotion.id)}/cover`,
    imageAttribution: promotion.coverAttribution,
    imageSourceUrl: promotion.coverSourceUrl,
  }));
}
