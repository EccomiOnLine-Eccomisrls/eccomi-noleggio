import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { auditLogs, hubEvents, integrations, leads, promotions } from "../../../../../db/schema";
import { requireCeo, routeError } from "../../../../lib/server/authz";
import { decryptCredential } from "../../../../lib/server/credential-crypto";
import { getRuntimeEnv } from "../../../../lib/server/runtime";

type Action = "SUSPEND" | "ARCHIVE" | "DELETE" | "RESTORE" | "PURGE";

type ShopifyAuth = { shop: string; token: string; apiVersion: string };

async function shopifyAuth(): Promise<ShopifyAuth> {
  const runtime = getRuntimeEnv();
  const shop = runtime.SHOPIFY_SHOP_DOMAIN?.trim();
  const token = runtime.SHOPIFY_ADMIN_ACCESS_TOKEN?.trim();
  const apiVersion = runtime.SHOPIFY_API_VERSION?.trim() || "2026-07";

  if (shop && token) return { shop, token, apiVersion };

  const [record] = await getDb()
    .select()
    .from(integrations)
    .where(eq(integrations.provider, "SHOPIFY"))
    .limit(1);

  if (!record || record.status !== "CONNECTED") {
    throw new Error("Collega prima Shopify.");
  }

  const clientSecret = await decryptCredential(record.encryptedClientSecret);
  const response = await fetch(`https://${record.shopDomain}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: record.clientId,
      client_secret: clientSecret,
    }),
  });
  const payload = await response.json().catch(() => ({})) as { access_token?: string };
  if (!response.ok || !payload.access_token) throw new Error("Shopify non ha autorizzato l'operazione.");

  return { shop: record.shopDomain, token: payload.access_token, apiVersion };
}

async function shopifyGraphql<T>(query: string, variables: Record<string, unknown>) {
  const auth = await shopifyAuth();
  const response = await fetch(`https://${auth.shop}/admin/api/${auth.apiVersion}/graphql.json`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-shopify-access-token": auth.token,
    },
    body: JSON.stringify({ query, variables }),
  });
  const payload = await response.json().catch(() => ({})) as {
    data?: T;
    errors?: Array<{ message: string }>;
  };
  if (!response.ok) throw new Error(`Shopify ha risposto con errore ${response.status}.`);
  if (payload.errors?.length) throw new Error(payload.errors.map((item) => item.message).join(" · "));
  if (!payload.data) throw new Error("Risposta Shopify incompleta.");
  return payload.data;
}

async function setProductStatus(productId: string, status: "DRAFT" | "ARCHIVED") {
  const data = await shopifyGraphql<{
    productUpdate: { userErrors: Array<{ message: string }> };
  }>(
    `mutation ManageEccomiProduct($product: ProductUpdateInput!) {
      productUpdate(product: $product) {
        userErrors { message }
      }
    }`,
    { product: { id: productId, status } },
  );
  if (data.productUpdate.userErrors.length) {
    throw new Error(data.productUpdate.userErrors.map((item) => item.message).join(" · "));
  }
}

async function deleteProduct(productId: string) {
  const data = await shopifyGraphql<{
    productDelete: { deletedProductId: string | null; userErrors: Array<{ message: string }> };
  }>(
    `mutation DeleteEccomiProduct($input: ProductDeleteInput!) {
      productDelete(input: $input) {
        deletedProductId
        userErrors { message }
      }
    }`,
    { input: { id: productId } },
  );
  if (data.productDelete.userErrors.length) {
    throw new Error(data.productDelete.userErrors.map((item) => item.message).join(" · "));
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireCeo(request);
    const { id } = await context.params;
    const body = await request.json().catch(() => ({})) as { action?: Action; confirm?: string };
    const action = body.action;
    if (!action || !["SUSPEND", "ARCHIVE", "DELETE", "RESTORE", "PURGE"].includes(action)) {
      return Response.json({ error: "Azione non valida." }, { status: 400 });
    }

    const [promotion] = await getDb().select().from(promotions).where(eq(promotions.id, id)).limit(1);
    if (!promotion) return Response.json({ error: "Promozione non trovata." }, { status: 404 });

    const [linkedLead] = await getDb().select({ id: leads.id }).from(leads).where(eq(leads.promotionId, id)).limit(1);

    if (action === "PURGE") {
      if (body.confirm !== "ELIMINA") {
        return Response.json({ error: "Conferma eliminazione non valida." }, { status: 400 });
      }
      if (promotion.status !== "TRASHED") {
        return Response.json({ error: "Prima sposta la promozione nel cestino." }, { status: 409 });
      }
      if (linkedLead) {
        return Response.json({ error: "La promozione ha pratiche collegate e non può essere cancellata definitivamente." }, { status: 409 });
      }
      if (promotion.shopifyProductId) await deleteProduct(promotion.shopifyProductId);
      await getDb().delete(promotions).where(eq(promotions.id, id));
    } else if (action === "DELETE") {
      if (promotion.shopifyProductId) await setProductStatus(promotion.shopifyProductId, "ARCHIVED");
      await getDb().update(promotions).set({
        status: "TRASHED",
        automationStatus: "TRASHED",
        automationError: null,
        shopifyUrl: null,
        updatedAt: new Date().toISOString(),
      }).where(eq(promotions.id, id));
    } else if (action === "RESTORE") {
      if (promotion.status !== "TRASHED") {
        return Response.json({ error: "La promozione non si trova nel cestino." }, { status: 409 });
      }
      if (promotion.shopifyProductId) await setProductStatus(promotion.shopifyProductId, "DRAFT");
      await getDb().update(promotions).set({
        status: "DRAFT",
        automationStatus: "RESTORED",
        automationError: null,
        updatedAt: new Date().toISOString(),
      }).where(eq(promotions.id, id));
    } else {
      const shopifyStatus = action === "SUSPEND" ? "DRAFT" : "ARCHIVED";
      if (promotion.shopifyProductId) await setProductStatus(promotion.shopifyProductId, shopifyStatus);
      const now = new Date().toISOString();
      await getDb().update(promotions).set({
        status: action === "SUSPEND" ? "DRAFT" : "ARCHIVED",
        automationStatus: action === "SUSPEND" ? "SUSPENDED" : "ARCHIVED",
        automationError: null,
        shopifyUrl: null,
        updatedAt: now,
      }).where(eq(promotions.id, id));
    }

    const now = new Date().toISOString();
    const label = action === "SUSPEND"
      ? "sospesa"
      : action === "ARCHIVE"
        ? "archiviata"
        : action === "DELETE"
          ? "spostata nel cestino"
          : action === "RESTORE"
            ? "ripristinata dal cestino"
            : "eliminata definitivamente";

    await getDb().insert(auditLogs).values({
      id: crypto.randomUUID(), actorEmail: actor.email,
      action: `PROMOTION_${action}`, entityType: "promotion", entityId: id,
      payloadJson: JSON.stringify({
        action,
        previousStatus: promotion.status,
        shopifyProductId: promotion.shopifyProductId,
      }),
    });
    await getDb().insert(hubEvents).values({
      id: crypto.randomUUID(), eventType: `NOLEGGIO_PROMOTION_${action}`,
      ecosystem: "ECCOMI_NOLEGGIO", entityType: "promotion", entityId: id,
      title: `${promotion.brand} ${promotion.model} ${label}`,
      payloadJson: JSON.stringify({ action, offerNumber: promotion.offerNumber }),
      actorEmail: actor.email, createdAt: now,
    });

    return Response.json({
      ok: true,
      action,
      trashed: action === "DELETE",
      deleted: action === "PURGE",
      restored: action === "RESTORE",
      status: action === "SUSPEND"
        ? "DRAFT"
        : action === "ARCHIVE"
          ? "ARCHIVED"
          : action === "DELETE"
            ? "TRASHED"
            : action === "RESTORE"
              ? "DRAFT"
              : null,
    });
  } catch (error) {
    return routeError(error);
  }
}
