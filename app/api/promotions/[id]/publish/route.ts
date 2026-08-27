import { eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { auditLogs, hubEvents, partners, promotions } from "../../../../../db/schema";
import { isInternalEccomiPartner } from "../../../../lib/partner-identity";
import { requirePermission, routeError } from "../../../../lib/server/authz";
import { getPromotionEccomiCommission } from "../../../../lib/server/commission-service";
import {
  isShopifyPublishingReady,
  publishPreparedPromotionToShopify,
  shopifyAdminFetch,
} from "../../../../lib/server/shopify";
import { publishProductToAllConfiguredShopifyChannels } from "../../../../lib/server/shopify-channels";

async function prepareProductForAutomaticCollection(productId: string) {
  const tagResult = await shopifyAdminFetch<{
    tagsAdd: { userErrors: Array<{ message: string }> };
  }>(
    `mutation AddEccomiNoleggioTag($id: ID!, $tags: [String!]!) {
      tagsAdd(id: $id, tags: $tags) {
        userErrors { field message }
      }
    }`,
    { id: productId, tags: ["eccomi-noleggio"] },
  );

  if (tagResult.tagsAdd.userErrors.length) {
    throw new Error(tagResult.tagsAdd.userErrors.map((error) => error.message).join(" · "));
  }

  const collectionData = await shopifyAdminFetch<{
    collectionByHandle: {
      id: string;
      ruleSet: {
        appliedDisjunctively: boolean;
        rules: Array<{ column: string; relation: string; condition: string }>;
      } | null;
    } | null;
  }>(
    `query EccomiNoleggioCollectionForPublishing($handle: String!) {
      collectionByHandle(handle: $handle) {
        id
        ruleSet {
          appliedDisjunctively
          rules { column relation condition }
        }
      }
    }`,
    { handle: "eccomi-noleggio" },
  );

  const collection = collectionData.collectionByHandle;
  if (!collection?.ruleSet) return;

  const hasCorrectTagRule = collection.ruleSet.rules.some(
    (rule) => rule.column === "TAG" && rule.relation === "EQUALS" && rule.condition.trim().toLowerCase() === "eccomi-noleggio",
  );
  const hasExtraRules = collection.ruleSet.rules.some((rule) => rule.column !== "TAG");
  if (hasCorrectTagRule && !hasExtraRules) return;

  const updateResult = await shopifyAdminFetch<{
    collectionUpdate: { userErrors: Array<{ message: string }> };
  }>(
    `mutation NormalizeEccomiNoleggioCollection($input: CollectionInput!) {
      collectionUpdate(input: $input) {
        userErrors { field message }
      }
    }`,
    {
      input: {
        id: collection.id,
        ruleSet: {
          appliedDisjunctively: false,
          rules: [{ column: "TAG", relation: "EQUALS", condition: "eccomi-noleggio" }],
        },
      },
    },
  );

  if (updateResult.collectionUpdate.userErrors.length) {
    throw new Error(updateResult.collectionUpdate.userErrors.map((error) => error.message).join(" · "));
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requirePermission(request, "QUOTE_PUBLISH");
    const { id } = await context.params;

    const [row] = await getDb()
      .select({ promotion: promotions, partnerName: partners.name, partnerLegalName: partners.legalName })
      .from(promotions)
      .innerJoin(partners, eq(promotions.partnerId, partners.id))
      .where(eq(promotions.id, id))
      .limit(1);

    if (!row) return Response.json({ error: "Promozione non trovata." }, { status: 404 });
    const promotion = row.promotion;

    if (promotion.status === "ONLINE" && promotion.shopifyUrl) {
      return Response.json({
        ok: true,
        url: promotion.shopifyUrl,
        status: "ONLINE",
        collectionId: promotion.shopifyCollectionId,
      });
    }

    if (!["PENDING_APPROVAL", "APPROVED"].includes(promotion.status)) {
      return Response.json({ error: "La promozione non è pronta per la pubblicazione." }, { status: 409 });
    }

    const internalEccomi = isInternalEccomiPartner({ name: row.partnerName, legalName: row.partnerLegalName });
    const eccomiCommissionCents = await getPromotionEccomiCommission(id);
    if (!internalEccomi && eccomiCommissionCents === null) {
      return Response.json({
        error: "Definisci prima la provvigione ECCOMI prevista a contratto concluso.",
      }, { status: 409 });
    }

    if (!(await isShopifyPublishingReady())) {
      return Response.json({
        error: "Shopify è collegato, ma la pagina ECCOMI NOLEGGIO deve essere completata prima della pubblicazione.",
      }, { status: 409 });
    }

    const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
    if (promotion.validUntil <= today) {
      return Response.json({ error: "La quotazione è scaduta e non può essere pubblicata." }, { status: 409 });
    }
    if (!promotion.shopifyProductId) {
      return Response.json({ error: "Crea prima la bozza Shopify e controllala." }, { status: 409 });
    }

    await prepareProductForAutomaticCollection(promotion.shopifyProductId);
    const result = await publishPreparedPromotionToShopify(promotion.shopifyProductId);
    const channels = await publishProductToAllConfiguredShopifyChannels(result.productId);
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
        channels,
        eccomiCommissionCents: eccomiCommissionCents ?? 0,
        internalEccomi,
        actorRole: actor.role,
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
        channels,
        eccomiCommissionCents: eccomiCommissionCents ?? 0,
      }),
      actorEmail: actor.email,
    });

    return Response.json({
      ok: true,
      status: "ONLINE",
      url: result.url,
      collectionId: result.collectionId,
      collectionHandle: result.collectionHandle,
      channels,
      hubEventId,
      visibleInShowroom: true,
      eccomiCommissionCents: eccomiCommissionCents ?? 0,
    });
  } catch (error) {
    return routeError(error);
  }
}
