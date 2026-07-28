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
  updateExistingPromotionOnShopify,
} from "../../../../lib/server/shopify";
import {
  storageGet,
  storagePut,
} from "../../../../lib/server/storage";
import { retrieveVehicleCover } from "../../../../lib/server/vehicle-image";
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

function safeExternalUrl(value: string | null | undefined) {
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

async function readCover(
  request: Request,
  coverKey: string,
) {
  if (coverKey.startsWith("asset:")) {
    const path = coverKey.slice(
      "asset:".length,
    );

    const response = await fetch(
      new URL(path, request.url),
    );

    if (!response.ok) {
      throw new Error(
        "Immagine promozionale non disponibile.",
      );
    }

    return {
      bytes: await response.arrayBuffer(),
      filename:
        path.split("/").pop() ||
        "eccomi-noleggio.png",
      mimeType:
        response.headers.get(
          "content-type",
        ) || "image/png",
      sourceUrl: null as string | null,
      attribution: null as string | null,
    };
  }

  const object = await storageGet(coverKey);

  if (!object) {
    throw new Error(
      "Immagine promozionale non disponibile.",
    );
  }

  return {
    bytes: object.bytes,
    filename:
      coverKey.split("/").pop() ||
      "eccomi-noleggio.png",
    mimeType:
      object.contentType || "image/png",
    sourceUrl: null as string | null,
    attribution: null as string | null,
  };
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
          error:
            "Promozione non trovata.",
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

    if (
      !(await isShopifyConfigured())
    ) {
      return Response.json(
        {
          error:
            "Collega prima Shopify.",
        },
        { status: 409 },
      );
    }

    const today =
      new Date().toLocaleDateString(
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

    let coverKey =
      promotion.coverKey;

    let cover:
      | Awaited<
          ReturnType<typeof readCover>
        >
      | null = coverKey
      ? {
          ...(
            await readCover(
              request,
              coverKey,
            )
          ),
          sourceUrl: safeExternalUrl(
            promotion.coverSourceUrl,
          ),
          attribution:
            promotion.coverAttribution,
        }
      : null;

    if (!cover) {
      const automatic =
        await retrieveVehicleCover({
          brand: promotion.brand,
          model: promotion.model,
          version: promotion.version,
          color: promotion.color,
        });

      const extension =
        automatic.mimeType ===
        "image/png"
          ? "png"
          : automatic.mimeType ===
              "image/webp"
            ? "webp"
            : "jpg";

      coverKey = `covers/${promotion.partnerId}/${promotion.id}/automatic-cover.${extension}`;

      await storagePut(
        coverKey,
        automatic.bytes,
        automatic.mimeType,
      );

      await getDb()
        .update(promotions)
        .set({
          coverKey,
          coverSourceKind:
            automatic.sourceKind,
          coverSourceUrl:
            safeExternalUrl(automatic.sourceUrl),
          coverAttribution:
            automatic.attribution,
          automationStatus:
            "PROCESSING",
          automationError: null,
          updatedAt:
            new Date().toISOString(),
        })
        .where(
          eq(promotions.id, id),
        );

      cover = {
        bytes: automatic.bytes,
        filename:
          automatic.filename,
        mimeType:
          automatic.mimeType,
        sourceUrl:
          safeExternalUrl(automatic.sourceUrl),
        attribution:
          automatic.attribution,
      };
    }

    if (!cover) {
      throw new Error(
        "Immagine promozionale non disponibile.",
      );
    }

    const result =
      await updateExistingPromotionOnShopify(
        promotion.shopifyProductId,
        {
          id: promotion.id,
          offerNumber:
            promotion.offerNumber,
          brand: promotion.brand,
          model: promotion.model,
          version: promotion.version,
          provider:
            promotion.provider,
          monthlyGrossCents:
            promotion.monthlyGrossCents,
          depositGrossCents:
            promotion.depositGrossCents,
          durationMonths:
            promotion.durationMonths,
          totalKm:
            promotion.totalKm,
          validUntil:
            promotion.validUntil,
          delivery:
            promotion.delivery,
          fuel: promotion.fuel,
          transmission:
            promotion.transmission,
          color: promotion.color,
          services: jsonArray(
            promotion.servicesJson,
          ),
          warnings: jsonArray(
            promotion.warningsJson,
          ),
        },
        cover,
      );

    const channels =
      await publishProductToAllConfiguredShopifyChannels(
        result.productId,
      );

    const now =
      new Date().toISOString();

    await getDb()
      .update(promotions)
      .set({
        status: "ONLINE",
        shopifyProductId:
          result.productId,
        shopifyHandle:
          result.handle,
        shopifyUrl: result.url,
        shopifyCollectionId:
          result.collectionId,
        automationStatus:
          "ONLINE",
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
          productId:
            result.productId,
          handle: result.handle,
          url: result.url,
          collectionId:
            result.collectionId,
          collectionHandle:
            result.collectionHandle,
          channels,
        }),
      });

    const hubEventId =
      crypto.randomUUID();

    await getDb()
      .insert(hubEvents)
      .values({
        id: hubEventId,
        eventType:
          "NOLEGGIO_PROMOTION_UPDATED_ONLINE",
        ecosystem:
          "ECCOMI_NOLEGGIO",
        entityType: "promotion",
        entityId: id,
        title: `${promotion.brand} ${promotion.model} aggiornata online`,
        payloadJson:
          JSON.stringify({
            offerNumber:
              promotion.offerNumber,
            productId:
              result.productId,
            productUrl:
              result.url,
            collectionId:
              result.collectionId,
            collectionHandle:
              result.collectionHandle,
            channels,
          }),
        actorEmail: actor.email,
      });

    return Response.json({
      ok: true,
      updated: true,
      status: "ONLINE",
      productId: result.productId,
      handle: result.handle,
      url: result.url,
      adminUrl: result.adminUrl,
      collectionId:
        result.collectionId,
      collectionHandle:
        result.collectionHandle,
      channels,
      hubEventId,
    });
  } catch (error) {
    return routeError(error);
  }
}
