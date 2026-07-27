import { eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { partners, promotions } from "../../../../../db/schema";
import { corsHeaders, jsonWithCors, publicCorsOrigin } from "../../../../lib/server/public-origin";

function parseJsonArray(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function publicPromotionState(status: string, validUntil: string) {
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
  return ["ONLINE", "ACTIVE", "EXPIRING"].includes(status) && validUntil >= today;
}

export async function OPTIONS(request: Request) {
  const origin = await publicCorsOrigin(request);
  if (!origin) return jsonWithCors({ error: "Origine non autorizzata." }, 403, null);
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const origin = await publicCorsOrigin(request);
  const sameOrigin = !request.headers.get("origin") || origin === new URL(request.url).origin;
  if (!sameOrigin && !origin) return jsonWithCors({ error: "Origine non autorizzata." }, 403, null);

  const { id } = await context.params;
  const [row] = await getDb()
    .select({ promotion: promotions, partnerName: partners.name })
    .from(promotions)
    .innerJoin(partners, eq(promotions.partnerId, partners.id))
    .where(eq(promotions.id, id))
    .limit(1);

  if (!row || !publicPromotionState(row.promotion.status, row.promotion.validUntil)) {
    return jsonWithCors({ error: "Offerta non disponibile o scaduta." }, 404, origin);
  }

  const promotion = row.promotion;
  return jsonWithCors({
    promotion: {
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
      color: promotion.color,
      services: parseJsonArray(promotion.servicesJson),
      warnings: parseJsonArray(promotion.warningsJson),
      imageUrl: `/api/public/promotions/${encodeURIComponent(promotion.id)}/cover`,
    },
  }, 200, origin);
}
