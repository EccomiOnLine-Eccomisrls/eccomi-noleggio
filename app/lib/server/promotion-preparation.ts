import { and, eq, isNull, ne } from "drizzle-orm";
import { getDb } from "../../../db";
import { auditLogs, hubEvents, promotions } from "../../../db/schema";
import {
  createPromotionDraftOnShopify,
  isShopifyConfigured,
  shopifyAdminFetch,
} from "./shopify";
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

async function findExistingPromotionDraftOnShopify(
  promotionId: string,
  offerNumber: string,
) {
  const safeOffer = offerNumber.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const data = await shopifyAdminFetch<{
    products: {
      nodes: Array<{
        id: string;
        handle: string;
        status: string;
        metafield: { value: string } | null;
      }>;
    };
  }>(
    `query FindExistingEccomiPromotionDraft($query: String!) {
      products(first: 20, query: $query) {
        nodes {
          id
          handle
          status
          metafield(namespace: "eccomi_noleggio", key: "promotion_id") {
            value
          }
        }
      }
    }`,
    { query: `tag:"offerta:${safeOffer}"` },
  );

  return data.products.nodes.find(
    (node) => node.status === "DRAFT" && node.metafield?.value === promotionId,
  ) || null;
}

async function waitForConcurrentPreparation(promotionId: string) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    await sleep(500);
    const [current] = await getDb()
      .select({
        shopifyProductId: promotions.shopifyProductId,
        shopifyHandle: promotions.shopifyHandle,
        automationStatus: promotions.automationStatus,
        automationError: promotions.automationError,
      })
      .from(promotions)
      .where(eq(promotions.id, promotionId))
      .limit(1);

    if (!current) throw new Error("Promozione non trovata.");
    if (current.shopifyProductId) {
      return {
        prepared: true,
        productId: current.shopifyProductId,
        handle: current.shopifyHandle,
        adminUrl: null as string | null,
        alreadyPrepared: true,
      };
    }
    if (current.automationStatus === "FAILED") {
      throw new Error(current.automationError || "Preparazione Shopify non riuscita.");
    }
  }

  throw new Error("Preparazione Shopify già in corso. Attendi qualche secondo e ricarica la pagina.");
}

async function acquirePreparationClaim(
  promotion: typeof promotions.$inferSelect,
) {
  const now = new Date().toISOString();

  if (promotion.automationStatus === "PROCESSING") {
    const updatedAt = Date.parse(promotion.updatedAt);
    const stale = Number.isFinite(updatedAt) && Date.now() - updatedAt > 120_000;
    if (!stale) return false;

    const claimed = await getDb()
      .update(promotions)
      .set({ automationStatus: "PROCESSING", automationError: null, updatedAt: now })
      .where(and(
        eq(promotions.id, promotion.id),
        isNull(promotions.shopifyProductId),
        eq(promotions.automationStatus, "PROCESSING"),
        eq(promotions.updatedAt, promotion.updatedAt),
      ))
      .returning({ id: promotions.id });

    return claimed.length === 1;
  }

  const claimed = await getDb()
    .update(promotions)
    .set({ automationStatus: "PROCESSING", automationError: null, updatedAt: now })
    .where(and(
      eq(promotions.id, promotion.id),
      isNull(promotions.shopifyProductId),
      ne(promotions.automationStatus, "PROCESSING"),
    ))
    .returning({ id: promotions.id });

  return claimed.length === 1;
}

async function recordPreparedPromotion(input: {
  promotion: typeof promotions.$inferSelect;
  actorEmail: string;
  productId: string;
  handle: string;
  action: "PROMOTION_DRAFT_CREATED_SHOPIFY" | "PROMOTION_DRAFT_REUSED_SHOPIFY";
}) {
  const { promotion, actorEmail, productId, handle, action } = input;
  const now = new Date().toISOString();

  await getDb().update(promotions).set({
    shopifyProductId: productId,
    shopifyHandle: handle,
    automationStatus: "READY_FOR_CEO",
    automationError: null,
    updatedAt: now,
  }).where(eq(promotions.id, promotion.id));

  await getDb().insert(auditLogs).values({
    id: crypto.randomUUID(),
    actorEmail,
    action,
    entityType: "promotion",
    entityId: promotion.id,
    payloadJson: JSON.stringify({
      productId,
      handle,
      resumedAfterExtension: promotion.automationStatus === "FAILED",
    }),
  }).catch(() => undefined);

  await getDb().insert(hubEvents).values({
    id: crypto.randomUUID(),
    eventType: "NOLEGGIO_PROMOTION_READY_FOR_CEO",
    ecosystem: "ECCOMI_NOLEGGIO",
    entityType: "promotion",
    entityId: promotion.id,
    title: `${promotion.brand} ${promotion.model}: bozza Shopify pronta per il CEO`,
    payloadJson: JSON.stringify({
      offerNumber: promotion.offerNumber,
      partnerId: promotion.partnerId,
      productId,
      reusedExistingDraft: action === "PROMOTION_DRAFT_REUSED_SHOPIFY",
    }),
    actorEmail,
  }).catch(() => undefined);
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

  const claimed = await acquirePreparationClaim(promotion);
  if (!claimed) return waitForConcurrentPreparation(promotionId);

  try {
    const existing = await findExistingPromotionDraftOnShopify(
      promotion.id,
      promotion.offerNumber,
    );

    if (existing) {
      await recordPreparedPromotion({
        promotion,
        actorEmail,
        productId: existing.id,
        handle: existing.handle,
        action: "PROMOTION_DRAFT_REUSED_SHOPIFY",
      });
      return {
        prepared: true,
        productId: existing.id,
        handle: existing.handle,
        adminUrl: null as string | null,
        alreadyPrepared: true,
      };
    }

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

    await recordPreparedPromotion({
      promotion,
      actorEmail,
      productId: result.productId,
      handle: result.handle,
      action: "PROMOTION_DRAFT_CREATED_SHOPIFY",
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
