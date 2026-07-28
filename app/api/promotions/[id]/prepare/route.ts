import { eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { auditLogs, hubEvents, promotions } from "../../../../../db/schema";
import { requireCeo, routeError } from "../../../../lib/server/authz";
import { createPromotionDraftOnShopify, isShopifyConfigured } from "../../../../lib/server/shopify";
import { getRuntimeEnv } from "../../../../lib/server/runtime";
import { storageGet, storagePut } from "../../../../lib/server/storage";
import { retrieveVehicleCover } from "../../../../lib/server/vehicle-image";

function jsonArray(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

async function readCover(request: Request, coverKey: string) {
  if (coverKey.startsWith("asset:")) {
    const path = coverKey.slice("asset:".length);
    const response = await getRuntimeEnv().ASSETS.fetch(new Request(new URL(path, request.url)));
    if (!response.ok) throw new Error("Immagine promozionale non disponibile.");
    return {
      bytes: await response.arrayBuffer(),
      filename: path.split("/").pop() || "eccomi-noleggio.png",
      mimeType: response.headers.get("content-type") || "image/png",
      sourceUrl: null as string | null,
      attribution: null as string | null,
    };
  }
  const object = await storageGet(coverKey);
  if (!object) throw new Error("Immagine promozionale non disponibile.");
  return {
    bytes: object.bytes,
    filename: coverKey.split("/").pop() || "eccomi-noleggio.png",
    mimeType: object.contentType || "image/png",
    sourceUrl: null as string | null,
    attribution: null as string | null,
  };
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireCeo(request);
    const { id } = await context.params;
    const [promotion] = await getDb().select().from(promotions).where(eq(promotions.id, id)).limit(1);
    if (!promotion) return Response.json({ error: "Promozione non trovata." }, { status: 404 });
    if (promotion.shopifyProductId) {
      return Response.json({ ok: true, prepared: true, productId: promotion.shopifyProductId, handle: promotion.shopifyHandle });
    }
    if (!["PENDING_APPROVAL", "APPROVED"].includes(promotion.status)) {
      return Response.json({ error: "La promozione non è in uno stato preparabile." }, { status: 409 });
    }
    if (!await isShopifyConfigured()) return Response.json({ error: "Collega prima Shopify." }, { status: 409 });
    const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
    if (promotion.validUntil <= today) return Response.json({ error: "La quotazione è scaduta e non può essere preparata." }, { status: 409 });
    let coverKey = promotion.coverKey;
    let cover: Awaited<ReturnType<typeof readCover>> | null = coverKey ? {
      ...(await readCover(request, coverKey)),
      sourceUrl: promotion.coverSourceUrl,
      attribution: promotion.coverAttribution,
    } : null;
    if (!cover) {
      const automatic = await retrieveVehicleCover({
        brand: promotion.brand,
        model: promotion.model,
        version: promotion.version,
        color: promotion.color,
      });
      const extension = automatic.mimeType === "image/png" ? "png" : automatic.mimeType === "image/webp" ? "webp" : "jpg";
      coverKey = `covers/${promotion.partnerId}/${promotion.id}/automatic-cover.${extension}`;
      await storagePut(
        coverKey,
        automatic.bytes,
        automatic.mimeType,
      );
      await getDb().update(promotions).set({
        coverKey,
        coverSourceKind: automatic.sourceKind,
        coverSourceUrl: automatic.sourceUrl,
        coverAttribution: automatic.attribution,
        automationStatus: "PROCESSING",
        automationError: null,
        updatedAt: new Date().toISOString(),
      }).where(eq(promotions.id, id));
      cover = {
        bytes: automatic.bytes,
        filename: automatic.filename,
        mimeType: automatic.mimeType,
        sourceUrl: automatic.sourceUrl,
        attribution: automatic.attribution,
      };
    }
    if (!cover) throw new Error("Immagine promozionale non disponibile.");

    const result = await createPromotionDraftOnShopify({
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
    }, cover);
    const now = new Date().toISOString();
    await getDb().update(promotions).set({
      shopifyProductId: result.productId,
      shopifyHandle: result.handle,
      automationStatus: "READY_FOR_CEO",
      automationError: null,
      updatedAt: now,
    }).where(eq(promotions.id, id));
    await getDb().insert(auditLogs).values({
      id: crypto.randomUUID(),
      actorEmail: actor.email,
      action: "PROMOTION_DRAFT_CREATED_SHOPIFY",
      entityType: "promotion",
      entityId: id,
      payloadJson: JSON.stringify({ productId: result.productId, handle: result.handle }),
    });
    await getDb().insert(hubEvents).values({
      id: crypto.randomUUID(),
      eventType: "NOLEGGIO_PROMOTION_READY_FOR_CEO",
      ecosystem: "ECCOMI_NOLEGGIO",
      entityType: "promotion",
      entityId: id,
      title: `${promotion.brand} ${promotion.model}: bozza Shopify pronta per il CEO`,
      payloadJson: JSON.stringify({ offerNumber: promotion.offerNumber, productId: result.productId }),
      actorEmail: actor.email,
    });
    return Response.json({ ok: true, prepared: true, productId: result.productId, handle: result.handle, adminUrl: result.adminUrl });
  } catch (error) {
    return routeError(error);
  }
}
