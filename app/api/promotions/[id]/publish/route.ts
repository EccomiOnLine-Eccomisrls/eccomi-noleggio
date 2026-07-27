import { eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { auditLogs, hubEvents, promotions } from "../../../../../db/schema";
import { requireCeo, routeError } from "../../../../lib/server/authz";
import { isShopifyPublishingReady, publishPreparedPromotionToShopify } from "../../../../lib/server/shopify";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireCeo(request);
    const { id } = await context.params;
    const [promotion] = await getDb().select().from(promotions).where(eq(promotions.id, id)).limit(1);
    if (!promotion) return Response.json({ error: "Promozione non trovata." }, { status: 404 });
    if (promotion.status === "ONLINE" && promotion.shopifyUrl) {
      return Response.json({ ok: true, url: promotion.shopifyUrl, status: "ONLINE", collectionId: promotion.shopifyCollectionId });
    }
    if (!["PENDING_APPROVAL", "APPROVED"].includes(promotion.status)) {
      return Response.json({ error: "La promozione non è pronta per la pubblicazione." }, { status: 409 });
    }
    if (!await isShopifyPublishingReady()) {
      return Response.json({ error: "Shopify è collegato, ma la pagina ECCOMI NOLEGGIO deve essere completata prima della pubblicazione." }, { status: 409 });
    }
    const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
    if (promotion.validUntil <= today) return Response.json({ error: "La quotazione è scaduta e non può essere pubblicata." }, { status: 409 });
    if (!promotion.shopifyProductId) return Response.json({ error: "Crea prima la bozza Shopify e controllala." }, { status: 409 });

    const result = await publishPreparedPromotionToShopify(promotion.shopifyProductId);
    const now = new Date().toISOString();
    await getDb().update(promotions).set({
      status: "ONLINE",
      shopifyProductId: result.productId,
      shopifyHandle: result.handle,
      shopifyUrl: result.url,
      shopifyCollectionId: result.collectionId,
      automationStatus: "ONLINE",
      automationError: null,
      approvedBy: actor.email,
      approvedAt: promotion.approvedAt || now,
      publishedAt: now,
      updatedAt: now,
    }).where(eq(promotions.id, id));
    await getDb().insert(auditLogs).values({
      id: crypto.randomUUID(),
      actorEmail: actor.email,
      action: "PROMOTION_PUBLISHED_SHOPIFY",
      entityType: "promotion",
      entityId: id,
      payloadJson: JSON.stringify({
        productId: result.productId,
        handle: result.handle,
        collectionId: result.collectionId,
        collectionHandle: result.collectionHandle,
        status: "ONLINE",
      }),
    });
    const hubEventId = crypto.randomUUID();
    await getDb().insert(hubEvents).values({
      id: hubEventId,
      eventType: "NOLEGGIO_PROMOTION_PUBLISHED_ONLINE",
      ecosystem: "ECCOMI_NOLEGGIO",
      entityType: "promotion",
      entityId: id,
      title: `${promotion.brand} ${promotion.model} pubblicata online`,
      payloadJson: JSON.stringify({
        offerNumber: promotion.offerNumber,
        productId: result.productId,
        productUrl: result.url,
        collectionId: result.collectionId,
        collectionHandle: result.collectionHandle,
        status: "ONLINE",
      }),
      actorEmail: actor.email,
    });
    return Response.json({
      ok: true,
      status: "ONLINE",
      url: result.url,
      collectionId: result.collectionId,
      collectionHandle: result.collectionHandle,
      hubEventId,
      visibleInShowroom: true,
    });
  } catch (error) {
    return routeError(error);
  }
}
