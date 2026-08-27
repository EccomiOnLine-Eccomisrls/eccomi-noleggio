import { eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { auditLogs, hubEvents, integrations, leads, promotions } from "../../../../../db/schema";
import { isPartnerNoleggioRole, type NoleggioPermission } from "../../../../lib/permissions";
import { actorHasPermission, requireActor, routeError } from "../../../../lib/server/authz";
import { decryptCredential } from "../../../../lib/server/credential-crypto";
import { partnerCanManageOffer, statusAfterPartnerExtension, statusAfterPartnerReactivation, type PartnerOfferAction } from "../../../../lib/server/partner-offer-policy";
import { preparePromotionDraft } from "../../../../lib/server/promotion-preparation";
import { isRenderPullRequestPreview } from "../../../../lib/server/preview-mode";
import { getRuntimeEnv } from "../../../../lib/server/runtime";

type Action = PartnerOfferAction | "DELETE" | "RESTORE" | "PURGE";
type ShopifyAuth = { shop: string; token: string; apiVersion: string };

const partnerPermissionForAction: Record<PartnerOfferAction, NoleggioPermission> = {
  SUSPEND: "QUOTE_SUSPEND_OWN",
  ARCHIVE: "QUOTE_ARCHIVE_OWN",
  EXTEND: "QUOTE_EXTEND_OWN",
  REACTIVATE: "QUOTE_REACTIVATE_OWN",
};

function todayRome() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
}

function validIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T12:00:00Z`).getTime());
}

function remainingDays(value: string) {
  const today = new Date(`${todayRome()}T12:00:00Z`).getTime();
  const target = new Date(`${value}T12:00:00Z`).getTime();
  return Math.ceil((target - today) / 86_400_000);
}

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

  if (!record || record.status !== "CONNECTED") throw new Error("Collega prima Shopify.");

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
    headers: { "content-type": "application/json", "x-shopify-access-token": auth.token },
    body: JSON.stringify({ query, variables }),
  });
  const payload = await response.json().catch(() => ({})) as { data?: T; errors?: Array<{ message: string }> };
  if (!response.ok) throw new Error(`Shopify ha risposto con errore ${response.status}.`);
  if (payload.errors?.length) throw new Error(payload.errors.map((item) => item.message).join(" · "));
  if (!payload.data) throw new Error("Risposta Shopify incompleta.");
  return payload.data;
}

async function setProductStatus(productId: string, status: "ACTIVE" | "DRAFT" | "ARCHIVED") {
  const data = await shopifyGraphql<{ productUpdate: { userErrors: Array<{ message: string }> } }>(
    `mutation ManageEccomiProduct($product: ProductUpdateInput!) {
      productUpdate(product: $product) { userErrors { message } }
    }`,
    { product: { id: productId, status } },
  );
  if (data.productUpdate.userErrors.length) throw new Error(data.productUpdate.userErrors.map((item) => item.message).join(" · "));
}

async function deleteProduct(productId: string) {
  const data = await shopifyGraphql<{ productDelete: { deletedProductId: string | null; userErrors: Array<{ message: string }> } }>(
    `mutation DeleteEccomiProduct($input: ProductDeleteInput!) {
      productDelete(input: $input) { deletedProductId userErrors { message } }
    }`,
    { input: { id: productId } },
  );
  if (data.productDelete.userErrors.length) throw new Error(data.productDelete.userErrors.map((item) => item.message).join(" · "));
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (isRenderPullRequestPreview(request)) {
      return Response.json({ error: "Preview sicura: nessuna modifica a offerte o Shopify viene eseguita." }, { status: 409 });
    }

    const actor = await requireActor(request);
    const { id } = await context.params;
    const body = await request.json().catch(() => ({})) as { action?: Action; confirm?: string; validUntil?: string };
    const action = body.action;
    if (!action || !["SUSPEND", "ARCHIVE", "EXTEND", "REACTIVATE", "DELETE", "RESTORE", "PURGE"].includes(action)) {
      return Response.json({ error: "Azione non valida." }, { status: 400 });
    }

    const [promotion] = await getDb().select().from(promotions).where(eq(promotions.id, id)).limit(1);
    if (!promotion) return Response.json({ error: "Promozione non trovata." }, { status: 404 });

    const partnerActor = isPartnerNoleggioRole(actor.role);
    if (actor.role !== "CEO" && !partnerActor) {
      return Response.json({ error: "Azione non abilitata per questo account." }, { status: 403 });
    }

    if (partnerActor) {
      if (!actor.partnerId || promotion.partnerId !== actor.partnerId) {
        return Response.json({ error: "Questa offerta non appartiene alla tua società." }, { status: 403 });
      }
      if (!["SUSPEND", "ARCHIVE", "EXTEND", "REACTIVATE"].includes(action)) {
        return Response.json({ error: "Azione riservata a ECCOMI." }, { status: 403 });
      }
      const partnerAction = action as PartnerOfferAction;
      if (!(await actorHasPermission(actor, partnerPermissionForAction[partnerAction]))) {
        return Response.json({ error: "Permesso non abilitato per questo account Partner." }, { status: 403 });
      }
      if (!partnerCanManageOffer(promotion.status, partnerAction)) {
        return Response.json({ error: "Azione non disponibile nello stato attuale dell’offerta." }, { status: 409 });
      }
    }

    const [linkedLead] = await getDb().select({ id: leads.id }).from(leads).where(eq(leads.promotionId, id)).limit(1);
    const now = new Date().toISOString();
    let nextStatus: string | null = null;
    let nextValidUntil = promotion.validUntil;
    let preparedAfterExtension = false;

    if (action === "PURGE") {
      if (body.confirm !== "ELIMINA") return Response.json({ error: "Conferma eliminazione non valida." }, { status: 400 });
      if (promotion.status !== "TRASHED") return Response.json({ error: "Prima sposta la promozione nel cestino." }, { status: 409 });
      if (linkedLead) return Response.json({ error: "La promozione ha pratiche collegate e non può essere cancellata definitivamente." }, { status: 409 });
      if (promotion.shopifyProductId) await deleteProduct(promotion.shopifyProductId);
      await getDb().delete(promotions).where(eq(promotions.id, id));
    } else if (action === "DELETE") {
      if (promotion.shopifyProductId) await setProductStatus(promotion.shopifyProductId, "ARCHIVED");
      nextStatus = "TRASHED";
      await getDb().update(promotions).set({ status: nextStatus, automationStatus: "TRASHED", automationError: null, shopifyUrl: null, updatedAt: now }).where(eq(promotions.id, id));
    } else if (action === "RESTORE") {
      if (promotion.status !== "TRASHED") return Response.json({ error: "La promozione non si trova nel cestino." }, { status: 409 });
      if (promotion.shopifyProductId) await setProductStatus(promotion.shopifyProductId, "DRAFT");
      nextStatus = "DRAFT";
      await getDb().update(promotions).set({ status: nextStatus, automationStatus: "RESTORED", automationError: null, updatedAt: now }).where(eq(promotions.id, id));
    } else if (action === "SUSPEND") {
      if (promotion.shopifyProductId) await setProductStatus(promotion.shopifyProductId, "DRAFT");
      nextStatus = "SUSPENDED";
      await getDb().update(promotions).set({ status: nextStatus, automationStatus: "SUSPENDED", automationError: null, updatedAt: now }).where(eq(promotions.id, id));
    } else if (action === "REACTIVATE") {
      if (!promotion.shopifyProductId || !promotion.publishedAt) {
        return Response.json({ error: "Questa offerta deve essere verificata da ECCOMI prima di poter essere riattivata." }, { status: 409 });
      }
      const days = remainingDays(promotion.validUntil);
      if (days <= 0) {
        return Response.json({ error: "L’offerta è scaduta. Aggiorna prima la data di scadenza." }, { status: 409 });
      }
      nextStatus = statusAfterPartnerReactivation(days);
      await setProductStatus(promotion.shopifyProductId, "ACTIVE");
      await getDb().update(promotions).set({ status: nextStatus, automationStatus: "ONLINE", automationError: null, updatedAt: now }).where(eq(promotions.id, id));
    } else if (action === "ARCHIVE") {
      if (promotion.shopifyProductId) await setProductStatus(promotion.shopifyProductId, "ARCHIVED");
      nextStatus = "ARCHIVED";
      await getDb().update(promotions).set({ status: nextStatus, automationStatus: "ARCHIVED", automationError: null, shopifyUrl: null, updatedAt: now }).where(eq(promotions.id, id));
    } else if (action === "EXTEND") {
      const validUntil = typeof body.validUntil === "string" ? body.validUntil.trim() : "";
      if (!validIsoDate(validUntil) || validUntil <= todayRome()) {
        return Response.json({ error: "Imposta una nuova data di scadenza futura." }, { status: 400 });
      }
      const days = remainingDays(validUntil);
      nextStatus = statusAfterPartnerExtension({ currentStatus: promotion.status, remainingDays: days, wasPublished: Boolean(promotion.publishedAt) });
      nextValidUntil = validUntil;
      const needsPreparation = nextStatus === "PENDING_APPROVAL" && !promotion.shopifyProductId && !promotion.publishedAt;

      if (promotion.shopifyProductId) {
        if (nextStatus === "SUSPENDED" || nextStatus === "PENDING_APPROVAL") await setProductStatus(promotion.shopifyProductId, "DRAFT");
        else await setProductStatus(promotion.shopifyProductId, "ACTIVE");
      }

      await getDb().update(promotions).set({
        validUntil,
        status: nextStatus,
        automationStatus: needsPreparation
          ? "PROCESSING"
          : nextStatus === "SUSPENDED"
            ? "SUSPENDED"
            : nextStatus === "PENDING_APPROVAL"
              ? "READY_FOR_CEO"
              : "ONLINE",
        automationError: null,
        updatedAt: now,
      }).where(eq(promotions.id, id));

      if (needsPreparation) {
        await preparePromotionDraft({ request, promotionId: id, actorEmail: actor.email });
        preparedAfterExtension = true;
      }
    }

    const label = action === "SUSPEND"
      ? "sospesa"
      : action === "REACTIVATE"
        ? "riattivata"
        : action === "ARCHIVE"
          ? "archiviata"
          : action === "EXTEND"
            ? `prorogata fino al ${nextValidUntil}`
            : action === "DELETE"
              ? "spostata nel cestino"
              : action === "RESTORE"
                ? "ripristinata dal cestino"
                : "eliminata definitivamente";

    await getDb().insert(auditLogs).values({
      id: crypto.randomUUID(), actorEmail: actor.email,
      action: `PROMOTION_${action}`, entityType: "promotion", entityId: id,
      payloadJson: JSON.stringify({ action, partnerId: promotion.partnerId, previousStatus: promotion.status, status: nextStatus, previousValidUntil: promotion.validUntil, validUntil: nextValidUntil, shopifyProductId: promotion.shopifyProductId, preparedAfterExtension }),
    });
    await getDb().insert(hubEvents).values({
      id: crypto.randomUUID(), eventType: `NOLEGGIO_PROMOTION_${action}`,
      ecosystem: "ECCOMI_NOLEGGIO", entityType: "promotion", entityId: id,
      title: `${promotion.brand} ${promotion.model} ${label}`,
      payloadJson: JSON.stringify({ action, offerNumber: promotion.offerNumber, partnerId: promotion.partnerId, status: nextStatus, validUntil: nextValidUntil, preparedAfterExtension }),
      actorEmail: actor.email, createdAt: now,
    });

    return Response.json({ ok: true, action, status: nextStatus, validUntil: nextValidUntil, preparedAfterExtension, reactivated: action === "REACTIVATE", trashed: action === "DELETE", deleted: action === "PURGE", restored: action === "RESTORE" });
  } catch (error) {
    return routeError(error);
  }
}
