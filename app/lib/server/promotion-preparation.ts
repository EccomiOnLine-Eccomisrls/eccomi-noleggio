import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { auditLogs, hubEvents, promotions } from "../../../db/schema";
import { createPromotionDraftOnShopify, isShopifyConfigured } from "./shopify";
import { storageGet, storagePut } from "./storage";
import { retrieveVehicleCover } from "./vehicle-image";

function jsonArray(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 1200) : "Errore inatteso durante la preparazione della bozza Shopify.";
}

async function readCover(request: Request, coverKey: string) {
  if (coverKey.startsWith("asset:")) {
    const path = coverKey.slice("asset:".length);
    const response = await fetch(new URL(path, request.url));
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

export async function preparePromotionDraft(input: {
  request: Request;
  promotionId: string;
  actorEmail: string;
}) {
  const { request, promotionId, actorEmail } = input;
  const [promotion] = await getDb().select().from(promotions).where(eq(promotions.id, promotionId)).limit(1);
  if (!promotion) throw new Error("Promozione non trovata.");

  if (promotion.shopifyProductId) {
    return {
      prepared: true,
      productId: promotion.shopifyProductId,
      handle: promotion.shopifyHandle,
      adminUrl: null as string | null,
      alreadyPrepared: true,
    };
  }

  if (!["PENDING_APPROVAL", "APPROVED"].includes(promotion.status)) {
    throw new Error("La promozione non è in uno stato preparabile.");
  }
  if (!await isShopifyConfigured()) throw new Error("Collega prima Shopify.");

  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
  if (promotion.validUntil <= today) throw new Error("La quotazione è scaduta e non può essere preparata.");

  try {
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
      await storagePut(coverKey, automatic.bytes, automatic.mimeType);
      await getDb().update(promotions).set({
        coverKey,
        coverSourceKind: automatic.sourceKind,
        coverSourceUrl: automatic.sourceUrl,
        coverAttribution: automatic.attribution,
        automationStatus: "PROCESSING",
        automationError: null,
        updatedAt: new Date().toISOString(),
      }).where(eq(promotions.id, promotionId));
      cover = {
        bytes: automatic.bytes,
        filename: automatic.filename,
        mimeType: automatic.mimeType,
        sourceUrl: automatic.sourceUrl,
        attribution: automatic.attribution,
      };
    }

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
    }).where(eq(promotions.id, promotionId));

    await getDb().insert(auditLogs).values({
      id: crypto.randomUUID(),
      actorEmail,
      action: "PROMOTION_DRAFT_CREATED_SHOPIFY",
      entityType: "promotion",
      entityId: promotionId,
      payloadJson: JSON.stringify({ productId: result.productId, handle: result.handle, resumedAfterExtension: promotion.automationStatus === "FAILED" }),
    });
    await getDb().insert(hubEvents).values({
      id: crypto.randomUUID(),
      eventType: "NOLEGGIO_PROMOTION_READY_FOR_CEO",
      ecosystem: "ECCOMI_NOLEGGIO",
      entityType: "promotion",
      entityId: promotionId,
      title: `${promotion.brand} ${promotion.model}: bozza Shopify pronta per il CEO`,
      payloadJson: JSON.stringify({ offerNumber: promotion.offerNumber, partnerId: promotion.partnerId, productId: result.productId }),
      actorEmail,
    });

    return {
      prepared: true,
      productId: result.productId,
      handle: result.handle,
      adminUrl: result.adminUrl,
      alreadyPrepared: false,
    };
  } catch (error) {
    await getDb().update(promotions).set({
      automationStatus: "FAILED",
      automationError: errorText(error),
      updatedAt: new Date().toISOString(),
    }).where(eq(promotions.id, promotionId)).catch(() => undefined);
    throw error;
  }
}
