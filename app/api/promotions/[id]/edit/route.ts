import { eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { auditLogs, hubEvents, promotions } from "../../../../../db/schema";
import { requireCeo, routeError } from "../../../../lib/server/authz";
import { updatePromotionOnShopifyWithoutUrlMetafields } from "../../../../lib/server/shopify-safe-update";

type EditPayload = {
  brand?: string;
  model?: string;
  version?: string;
  provider?: string;
  monthlyGrossCents?: number;
  depositGrossCents?: number;
  durationMonths?: number;
  totalKm?: number;
  validUntil?: string;
  delivery?: string;
  fuel?: string;
  transmission?: string;
  color?: string;
  services?: string[];
  warnings?: string[];
  syncShopify?: boolean;
  reactivate?: boolean;
};

function isPullRequestPreview() {
  return process.env.IS_PULL_REQUEST === "true";
}

function jsonArray(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function cleanString(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function positiveInteger(value: unknown, label: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} non valido.`);
  }
  return parsed;
}

function nonNegativeInteger(value: unknown, label: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${label} non valido.`);
  }
  return parsed;
}

function validIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T12:00:00Z`).getTime());
}

function todayRome() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
}

function daysFromToday(value: string) {
  const today = new Date(`${todayRome()}T12:00:00Z`).getTime();
  const target = new Date(`${value}T12:00:00Z`).getTime();
  return Math.ceil((target - today) / 86_400_000);
}

function responsePromotion(promotion: typeof promotions.$inferSelect) {
  return {
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
    services: jsonArray(promotion.servicesJson),
    warnings: jsonArray(promotion.warningsJson),
    status: promotion.status,
    shopifyProductId: promotion.shopifyProductId,
    shopifyUrl: promotion.shopifyUrl,
    updatedAt: promotion.updatedAt,
  };
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireCeo(request);
    const { id } = await context.params;
    const [promotion] = await getDb().select().from(promotions).where(eq(promotions.id, id)).limit(1);
    if (!promotion) return Response.json({ error: "Promozione non trovata." }, { status: 404 });
    return Response.json({
      promotion: responsePromotion(promotion),
      preview: isPullRequestPreview(),
    });
  } catch (error) {
    return routeError(error);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireCeo(request);
    const { id } = await context.params;
    const body = await request.json().catch(() => ({})) as EditPayload;

    const [promotion] = await getDb().select().from(promotions).where(eq(promotions.id, id)).limit(1);
    if (!promotion) return Response.json({ error: "Promozione non trovata." }, { status: 404 });
    if (["TRASHED", "ARCHIVED"].includes(promotion.status)) {
      return Response.json({ error: "Ripristina prima la promozione per modificarla." }, { status: 409 });
    }

    const brand = cleanString(body.brand, promotion.brand).toUpperCase();
    const model = cleanString(body.model, promotion.model);
    const version = cleanString(body.version, promotion.version);
    const provider = cleanString(body.provider, promotion.provider);
    const delivery = cleanString(body.delivery, promotion.delivery);
    const fuel = cleanString(body.fuel, promotion.fuel);
    const transmission = cleanString(body.transmission, promotion.transmission);
    const color = cleanString(body.color, promotion.color);
    const monthlyGrossCents = positiveInteger(body.monthlyGrossCents ?? promotion.monthlyGrossCents, "Canone");
    const depositGrossCents = nonNegativeInteger(body.depositGrossCents ?? promotion.depositGrossCents, "Anticipo");
    const durationMonths = positiveInteger(body.durationMonths ?? promotion.durationMonths, "Durata");
    const totalKm = positiveInteger(body.totalKm ?? promotion.totalKm, "Chilometri");
    const validUntil = cleanString(body.validUntil, promotion.validUntil);
    const services = Array.isArray(body.services) ? body.services.map((item) => cleanString(item)).filter(Boolean) : jsonArray(promotion.servicesJson);
    const warnings = Array.isArray(body.warnings) ? body.warnings.map((item) => cleanString(item)).filter(Boolean) : jsonArray(promotion.warningsJson);

    if (!brand || !model || !provider) throw new Error("Marca, modello e noleggiatore sono obbligatori.");
    if (!validIsoDate(validUntil)) throw new Error("Data di scadenza non valida.");

    const remainingDays = daysFromToday(validUntil);
    const reactivate = body.reactivate === true;
    if (reactivate && remainingDays <= 0) {
      return Response.json({ error: "Per riattivare l'offerta imposta una nuova data futura." }, { status: 409 });
    }

    let nextStatus = promotion.status;
    if (remainingDays <= 0) {
      nextStatus = "EXPIRED";
    } else if (promotion.status === "EXPIRED") {
      nextStatus = reactivate ? (promotion.shopifyProductId ? "ONLINE" : "PENDING_APPROVAL") : "EXPIRED";
    } else if (promotion.status === "EXPIRING" && remainingDays > 7) {
      nextStatus = "ONLINE";
    }

    const updatedPromotion = {
      id: promotion.id,
      offerNumber: promotion.offerNumber,
      brand,
      model,
      version,
      provider,
      monthlyGrossCents,
      depositGrossCents,
      durationMonths,
      totalKm,
      validUntil,
      delivery,
      fuel,
      transmission,
      color,
      services,
      warnings,
    };

    const changedFields = Object.entries({
      brand: [promotion.brand, brand],
      model: [promotion.model, model],
      version: [promotion.version, version],
      provider: [promotion.provider, provider],
      monthlyGrossCents: [promotion.monthlyGrossCents, monthlyGrossCents],
      depositGrossCents: [promotion.depositGrossCents, depositGrossCents],
      durationMonths: [promotion.durationMonths, durationMonths],
      totalKm: [promotion.totalKm, totalKm],
      validUntil: [promotion.validUntil, validUntil],
      delivery: [promotion.delivery, delivery],
      fuel: [promotion.fuel, fuel],
      transmission: [promotion.transmission, transmission],
      color: [promotion.color, color],
    }).filter(([, values]) => values[0] !== values[1]).map(([field]) => field);

    // PR Preview safety: Render copies the base service environment variables to
    // the preview. Never mutate production Supabase or Shopify from a preview.
    if (isPullRequestPreview()) {
      return Response.json({
        ok: true,
        preview: true,
        simulated: true,
        promotion: {
          ...responsePromotion(promotion),
          ...updatedPromotion,
          status: nextStatus,
          updatedAt: new Date().toISOString(),
        },
        shopify: null,
        changedFields,
        reactivated: reactivate,
        message: "SIMULAZIONE PREVIEW: nessuna modifica salvata su Supabase o Shopify.",
      });
    }

    const shouldSyncShopify = body.syncShopify !== false && Boolean(promotion.shopifyProductId);
    let shopifyResult: Awaited<ReturnType<typeof updatePromotionOnShopifyWithoutUrlMetafields>> | null = null;

    if (shouldSyncShopify && promotion.shopifyProductId) {
      const shouldBeOnline = reactivate || ["ONLINE", "ACTIVE", "EXPIRING"].includes(nextStatus);
      shopifyResult = await updatePromotionOnShopifyWithoutUrlMetafields(
        promotion.shopifyProductId,
        updatedPromotion,
        { status: shouldBeOnline ? "ACTIVE" : "DRAFT" },
      );
    }

    const now = new Date().toISOString();
    await getDb().update(promotions).set({
      brand,
      model,
      version,
      provider,
      monthlyGrossCents,
      depositGrossCents,
      durationMonths,
      totalKm,
      validUntil,
      delivery,
      fuel,
      transmission,
      color,
      servicesJson: JSON.stringify(services),
      warningsJson: JSON.stringify(warnings),
      status: nextStatus,
      automationStatus: shopifyResult
        ? (shopifyResult.status === "ACTIVE" ? "ONLINE" : "READY_FOR_CEO")
        : promotion.automationStatus,
      automationError: null,
      shopifyHandle: shopifyResult?.handle || promotion.shopifyHandle,
      shopifyUrl: shopifyResult?.url || promotion.shopifyUrl,
      updatedAt: now,
    }).where(eq(promotions.id, id));

    await getDb().insert(auditLogs).values({
      id: crypto.randomUUID(),
      actorEmail: actor.email,
      action: reactivate ? "PROMOTION_REACTIVATED_AND_EDITED" : "PROMOTION_EDITED",
      entityType: "promotion",
      entityId: id,
      payloadJson: JSON.stringify({
        changedFields,
        previousValidUntil: promotion.validUntil,
        validUntil,
        previousStatus: promotion.status,
        status: nextStatus,
        shopifyProductId: promotion.shopifyProductId,
        shopifySynced: Boolean(shopifyResult),
        publicTitle: shopifyResult?.publicTitle || null,
      }),
    });

    await getDb().insert(hubEvents).values({
      id: crypto.randomUUID(),
      eventType: reactivate ? "NOLEGGIO_PROMOTION_REACTIVATED" : "NOLEGGIO_PROMOTION_EDITED",
      ecosystem: "ECCOMI_NOLEGGIO",
      entityType: "promotion",
      entityId: id,
      title: reactivate
        ? `${brand} ${model} riattivata fino al ${validUntil}`
        : `${brand} ${model} aggiornata`,
      payloadJson: JSON.stringify({
        offerNumber: promotion.offerNumber,
        changedFields,
        validUntil,
        status: nextStatus,
        shopifySynced: Boolean(shopifyResult),
      }),
      actorEmail: actor.email,
      createdAt: now,
    });

    const [saved] = await getDb().select().from(promotions).where(eq(promotions.id, id)).limit(1);
    return Response.json({
      ok: true,
      preview: false,
      promotion: saved ? responsePromotion(saved) : null,
      shopify: shopifyResult,
      changedFields,
      reactivated: reactivate,
    });
  } catch (error) {
    return routeError(error);
  }
}
