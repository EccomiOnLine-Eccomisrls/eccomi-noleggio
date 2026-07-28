import { eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import {
  auditLogs,
  hubEvents,
  promotions,
} from "../../../../../db/schema";
import {
  requireCeo,
  routeError,
} from "../../../../lib/server/authz";
import {
  isShopifyConfigured,
} from "../../../../lib/server/shopify";
import { updatePromotionOnShopifyWithoutUrlMetafields } from "../../../../lib/server/shopify-safe-update";
import { publishProductToAllConfiguredShopifyChannels } from "../../../../lib/server/shopify-channels";

function jsonArray(value: string) {
  try {
    const parsed = JSON.parse(value);

    return Array.isArray(parsed)
      ? parsed.filter(
          (item): item is string =>
            typeof item === "string",
        )
      : [];
  } catch {
    return [];
  }
}

export async function POST(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const actor = await requireCeo(request);
    const { id } = await context.params;

    const [promotion] = await getDb()
      .select()
      .from(promotions)
      .where(eq(promotions.id, id))
      .limit(1);

    if (!promotion) {
      return Response.json(
        {
          error: "Promozione non trovata.",
        },
        { status: 404 },
      );
    }

    if (!promotion.shopifyProductId) {
      return Response.json(
        {
          error:
            "Il prodotto Shopify non è stato ancora creato.",
        },
        { status: 409 },
      );
    }

    if (!(await isShopifyConfigured())) {
      return Response.json(
        {
          error: "Collega prima Shopify.",
        },
        { status: 409 },
      );
    }

    const today = new Date().toLocaleDateString(
      "sv-SE",
      {
        timeZone: "Europe/Rome",
      },
    );

    if (promotion.validUntil <= today) {
      return Response.json(
        {
          error:
            "La quotazione è scaduta e non può essere aggiornata.",
        },
        { status: 409 },
      );
    }

    const result =
      await updatePromotionOnShopifyWithoutUrlMetafields(
        promotion.shopifyProductId,
        {
          id: promotion.id,
          offerNumber: promotion.offerNumber,
          brand: promotion.brand,
          model: promotion.model,
          version: promotion.version,
          provider: promotion.provider,
          monthlyGrossCents:
            promotion.monthlyGrossCents,
          depositGrossCents:
            promotion.depositGrossCents,
          durationMonths:
            promotion.durationMonths,
          totalKm: promotion.totalKm,
          validUntil: promotion.validUntil,
          delivery: promotion.delivery,
          fuel: promotion.fuel,
          transmission: promotion.transmission,
          color: promotion.color,
          services: jsonArray(
            promotion.servicesJson,
          ),
          warnings: jsonArray(
            promotion.warningsJson,
          ),
        },
      );

    const channels =
      await publishProductToAllConfiguredShopifyChannels(
        result.productId,
      );

    const now = new Date().toISOString();
    const productUrl =
      promotion.shopifyUrl || result.url;

    await getDb()
      .update(promotions)
      .set({
        status: "ONLINE",
        shopifyProductId: result.productId,
        shopifyHandle: result.handle,
        shopifyUrl: productUrl,
        automationStatus: "ONLINE",
        automationError: null,
        updatedAt: now,
      })
      .where(eq(promotions.id, id));

    await getDb()
      .insert(auditLogs)
      .values({
        id: crypto.randomUUID(),
        actorEmail: actor.email,
        action:
          "PROMOTION_UPDATED_SHOPIFY",
        entityType: "promotion",
        entityId: id,
        payloadJson: JSON.stringify({
          productId: result.productId,
          handle: result.handle,
          url: productUrl,
          collectionId:
            promotion.shopifyCollectionId,
          channels,
          safeUrlUpdate: true,
        }),
      });

    const hubEventId = crypto.randomUUID();

    await getDb()
      .insert(hubEvents)
      .values({
        id: hubEventId,
        eventType:
          "NOLEGGIO_PROMOTION_UPDATED_ONLINE",
        ecosystem: "ECCOMI_NOLEGGIO",
        entityType: "promotion",
        entityId: id,
        title: `${promotion.brand} ${promotion.model} aggiornata online`,
        payloadJson: JSON.stringify({
          offerNumber: promotion.offerNumber,
          productId: result.productId,
          productUrl,
          collectionId:
            promotion.shopifyCollectionId,
          channels,
          safeUrlUpdate: true,
        }),
        actorEmail: actor.email,
      });

    return Response.json({
      ok: true,
      updated: true,
      status: "ONLINE",
      productId: result.productId,
      handle: result.handle,
      url: productUrl,
      adminUrl: result.adminUrl,
      collectionId:
        promotion.shopifyCollectionId,
      channels,
      hubEventId,
    });
  } catch (error) {
    return routeError(error);
  }
}
