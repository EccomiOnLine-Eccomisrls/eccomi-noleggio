import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { integrations } from "../../../db/schema";
import { decryptCredential, encryptCredential } from "./credential-crypto";
import { getRuntimeEnv } from "./runtime";

type ShopifyPromotion = {
  id: string;
  offerNumber: string;
  brand: string;
  model: string;
  version: string;
  provider: string;
  monthlyGrossCents: number;
  depositGrossCents: number;
  durationMonths: number;
  totalKm: number;
  validUntil: string;
  delivery: string;
  fuel: string;
  transmission: string;
  color: string;
  services: string[];
  warnings: string[];
};

type ProductCover = {
  bytes: ArrayBuffer;
  filename: string;
  mimeType: string;
  sourceUrl?: string | null;
  attribution?: string | null;
};

type GraphqlResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

type ShopifyConfiguration = {
  shop: string;
  token: string;
  publicationId: string;
  publicationAutoPublish: boolean;
  apiVersion: string;
  templateSuffix: string;
  collectionHandle: string;
  storefrontBaseUrl: string;
  requestBaseUrl: string;
};

type TokenCacheEntry = { token: string; expiresAt: number };

export type ShopifyConnectionStatus = {
  connected: boolean;
  publishingReady: boolean;
  shopDomain: string | null;
  shopName: string | null;
  storefrontUrl: string | null;
  publicationLabel: string | null;
  clientIdHint: string | null;
  verifiedAt: string | null;
};

const SHOPIFY_INTEGRATION_ID = "shopify-primary";
const tokenCache = new Map<string, TokenCacheEntry>();

function enabled(value: string | undefined) {
  return ["true", "1", "yes", "si", "sì", "on"].includes(value?.trim().toLowerCase() || "");
}

export function normalizeShopDomain(value: string) {
  let candidate = value.trim().toLowerCase().replace(/^https?:\/\//, "");
  candidate = candidate.split("/")[0].replace(/\.$/, "");
  if (candidate && !candidate.includes(".")) candidate = `${candidate}.myshopify.com`;
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(candidate)) {
    throw new Error("Inserisci il dominio Shopify nel formato nome-negozio.myshopify.com.");
  }
  return candidate;
}

function clientIdHint(clientId: string) {
  return clientId.length <= 8 ? clientId : `••••${clientId.slice(-6)}`;
}

async function acquireClientCredentialsToken(shop: string, clientId: string, clientSecret: string) {
  const cacheKey = `${shop}:${clientId}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + 5 * 60_000) return cached.token;

  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  const payload = await response.json().catch(() => ({})) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!response.ok || !payload.access_token) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("Shopify ha rifiutato Client ID o Client secret. Controlla i due valori e riprova.");
    }
    if (payload.error === "shop_not_permitted") {
      throw new Error("L’app e il negozio Shopify non risultano nella stessa organizzazione.");
    }
    throw new Error("Shopify non ha autorizzato il collegamento. Riprova tra poco.");
  }
  const expiresIn = Math.max(300, Number(payload.expires_in || 86_399));
  tokenCache.set(cacheKey, { token: payload.access_token, expiresAt: Date.now() + expiresIn * 1000 });
  return payload.access_token;
}

async function graphqlWithConfiguration<T>(
  config: ShopifyConfiguration,
  query: string,
  variables: Record<string, unknown> = {},
) {
  const response = await fetch(`https://${config.shop}/admin/api/${config.apiVersion}/graphql.json`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-shopify-access-token": config.token,
    },
    body: JSON.stringify({ query, variables }),
  });
  const payload = await response.json().catch(() => ({})) as GraphqlResponse<T>;
  if (!response.ok) throw new Error(`Shopify ha risposto con errore ${response.status}.`);
  if (payload.errors?.length) throw new Error(payload.errors.map((error) => error.message).join(" · "));
  if (!payload.data) throw new Error("Risposta Shopify incompleta.");
  return payload.data;
}

async function configuration(): Promise<ShopifyConfiguration> {
  const runtime = getRuntimeEnv();
  const staticShop = runtime.SHOPIFY_SHOP_DOMAIN?.trim();
  const staticToken = runtime.SHOPIFY_ADMIN_ACCESS_TOKEN?.trim();
  const staticPublication = runtime.SHOPIFY_ONLINE_STORE_PUBLICATION_ID?.trim();
  if (staticShop && staticToken && staticPublication) {
    const shop = normalizeShopDomain(staticShop);
    return {
      shop,
      token: staticToken,
      publicationId: staticPublication,
      publicationAutoPublish: false,
      apiVersion: runtime.SHOPIFY_API_VERSION?.trim() || "2026-07",
      templateSuffix: runtime.SHOPIFY_NOLEGGIO_TEMPLATE_SUFFIX?.trim() || "eccomi-noleggio",
      collectionHandle: runtime.SHOPIFY_NOLEGGIO_COLLECTION_HANDLE?.trim() || "eccomi-noleggio",
      storefrontBaseUrl: `https://${shop}`,
      requestBaseUrl: runtime.PUBLIC_REQUEST_BASE_URL?.trim() || "",
    };
  }

  const [record] = await getDb()
    .select()
    .from(integrations)
    .where(eq(integrations.id, SHOPIFY_INTEGRATION_ID))
    .limit(1);
  if (!record || record.status !== "CONNECTED") throw new Error("Collegamento Shopify non ancora configurato.");
  const clientSecret = await decryptCredential(record.encryptedClientSecret);
  const token = await acquireClientCredentialsToken(record.shopDomain, record.clientId, clientSecret);
  return {
    shop: record.shopDomain,
    token,
    publicationId: record.publicationId,
    publicationAutoPublish: record.publicationAutoPublish,
    apiVersion: runtime.SHOPIFY_API_VERSION?.trim() || "2026-07",
    templateSuffix: runtime.SHOPIFY_NOLEGGIO_TEMPLATE_SUFFIX?.trim() || "eccomi-noleggio",
    collectionHandle: runtime.SHOPIFY_NOLEGGIO_COLLECTION_HANDLE?.trim() || "eccomi-noleggio",
    storefrontBaseUrl: record.storefrontUrl || `https://${record.shopDomain}`,
    requestBaseUrl: runtime.PUBLIC_REQUEST_BASE_URL?.trim() || "",
  };
}

export async function getShopifyConnectionStatus(): Promise<ShopifyConnectionStatus> {
  const runtime = getRuntimeEnv();
  const publishingReady = enabled(runtime.SHOPIFY_PUBLISHING_ENABLED);
  if (runtime.SHOPIFY_SHOP_DOMAIN && runtime.SHOPIFY_ADMIN_ACCESS_TOKEN && runtime.SHOPIFY_ONLINE_STORE_PUBLICATION_ID) {
    return {
      connected: true,
      publishingReady,
      shopDomain: normalizeShopDomain(runtime.SHOPIFY_SHOP_DOMAIN),
      shopName: "Eccomi OnLine",
      storefrontUrl: null,
      publicationLabel: "Negozio online",
      clientIdHint: "Configurazione protetta",
      verifiedAt: null,
    };
  }
  const [record] = await getDb()
    .select()
    .from(integrations)
    .where(eq(integrations.id, SHOPIFY_INTEGRATION_ID))
    .limit(1);
  return {
    connected: Boolean(record && record.status === "CONNECTED"),
    publishingReady: Boolean(record && record.status === "CONNECTED" && publishingReady),
    shopDomain: record?.shopDomain || null,
    shopName: record?.shopName || null,
    storefrontUrl: record?.storefrontUrl || null,
    publicationLabel: record?.publicationLabel || null,
    clientIdHint: record ? clientIdHint(record.clientId) : null,
    verifiedAt: record?.verifiedAt || null,
  };
}

export async function isShopifyConfigured() {
  return (await getShopifyConnectionStatus()).connected;
}

export async function isShopifyPublishingReady() {
  return (await getShopifyConnectionStatus()).publishingReady;
}

export async function connectShopifyIntegration(input: {
  shopDomain: string;
  clientId: string;
  clientSecret: string;
  actorEmail: string;
}) {
  const shopDomain = normalizeShopDomain(input.shopDomain);
  const clientId = input.clientId.trim();
  const clientSecret = input.clientSecret.trim();
  if (clientId.length < 12 || clientId.length > 240) throw new Error("Il Client ID Shopify non sembra completo.");
  if (clientSecret.length < 12 || clientSecret.length > 500) throw new Error("Il Client secret Shopify non sembra completo.");

  const runtime = getRuntimeEnv();
  const token = await acquireClientCredentialsToken(shopDomain, clientId, clientSecret);
  const verificationConfig: ShopifyConfiguration = {
    shop: shopDomain,
    token,
    publicationId: "",
    publicationAutoPublish: false,
    apiVersion: runtime.SHOPIFY_API_VERSION?.trim() || "2026-07",
    templateSuffix: runtime.SHOPIFY_NOLEGGIO_TEMPLATE_SUFFIX?.trim() || "eccomi-noleggio",
    collectionHandle: runtime.SHOPIFY_NOLEGGIO_COLLECTION_HANDLE?.trim() || "eccomi-noleggio",
    storefrontBaseUrl: `https://${shopDomain}`,
    requestBaseUrl: runtime.PUBLIC_REQUEST_BASE_URL?.trim() || "",
  };
  const verification = await graphqlWithConfiguration<{
    shop: { name: string; myshopifyDomain: string; primaryDomain: { url: string } | null };
    publications: {
      nodes: Array<{
        id: string;
        autoPublish: boolean;
        supportsFuturePublishing: boolean;
        catalog: { title: string } | null;
      }>;
    };
  }>(verificationConfig, `query VerifyEccomiNoleggioConnection {
    shop { name myshopifyDomain primaryDomain { url } }
    publications(first: 50) {
      nodes { id autoPublish supportsFuturePublishing catalog { title } }
    }
  }`);
  const verifiedDomain = normalizeShopDomain(verification.shop.myshopifyDomain);
  if (verifiedDomain !== shopDomain) throw new Error("Il Client ID appartiene a un negozio Shopify diverso.");
  const onlineStore = verification.publications.nodes.find((publication) => publication.supportsFuturePublishing)
    || verification.publications.nodes.find((publication) => /online store|negozio online/i.test(publication.catalog?.title || ""));
  if (!onlineStore) throw new Error("Il canale Negozio online non è stato trovato tra le pubblicazioni Shopify.");

  const now = new Date().toISOString();
  const encryptedClientSecret = await encryptCredential(clientSecret);
  await getDb().insert(integrations).values({
    id: SHOPIFY_INTEGRATION_ID,
    provider: "SHOPIFY",
    shopDomain,
    shopName: verification.shop.name,
    storefrontUrl: verification.shop.primaryDomain?.url || `https://${shopDomain}`,
    clientId,
    encryptedClientSecret,
    publicationId: onlineStore.id,
    publicationLabel: onlineStore.catalog?.title || "Negozio online",
    publicationAutoPublish: onlineStore.autoPublish,
    status: "CONNECTED",
    connectedBy: input.actorEmail,
    connectedAt: now,
    verifiedAt: now,
    updatedAt: now,
  }).onConflictDoUpdate({
    target: integrations.id,
    set: {
      shopDomain,
      shopName: verification.shop.name,
      storefrontUrl: verification.shop.primaryDomain?.url || `https://${shopDomain}`,
      clientId,
      encryptedClientSecret,
      publicationId: onlineStore.id,
      publicationLabel: onlineStore.catalog?.title || "Negozio online",
      publicationAutoPublish: onlineStore.autoPublish,
      status: "CONNECTED",
      connectedBy: input.actorEmail,
      connectedAt: now,
      verifiedAt: now,
      updatedAt: now,
    },
  });
  return getShopifyConnectionStatus();
}

async function graphql<T>(query: string, variables: Record<string, unknown>) {
  return graphqlWithConfiguration<T>(await configuration(), query, variables);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] || character);
}

function euro(cents: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(cents / 100);
}

function titleFor(promotion: ShopifyPromotion) {
  return `${promotion.brand} ${promotion.model} a noleggio lungo termine – ${euro(promotion.monthlyGrossCents)}/mese`;
}

function requestUrlFor(requestBaseUrl: string, promotionId: string) {
  if (!requestBaseUrl) return "";
  try {
    const url = new URL(requestBaseUrl);
    url.searchParams.set("promozione", promotionId);
    return url.toString();
  } catch {
    return "";
  }
}

function descriptionFor(promotion: ShopifyPromotion, requestBaseUrl: string, cover: ProductCover) {
  const services = promotion.services.map((service) => `<li>${escapeHtml(service)}</li>`).join("");
  const warnings = promotion.warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("");
  const requestUrl = requestUrlFor(requestBaseUrl, promotion.id);
  return [
    `<h2>${escapeHtml(promotion.brand)} ${escapeHtml(promotion.model)}</h2>`,
    `<p><strong>${euro(promotion.monthlyGrossCents)} al mese IVA inclusa</strong></p>`,
    `<p><strong>Anticipo:</strong> ${euro(promotion.depositGrossCents)} · <strong>Durata:</strong> ${promotion.durationMonths} mesi · <strong>Chilometri:</strong> ${promotion.totalKm.toLocaleString("it-IT")} km</p>`,
    promotion.delivery ? `<p><strong>Consegna prevista:</strong> ${escapeHtml(promotion.delivery)}</p>` : "",
    requestUrl
      ? `<p><a href="${escapeHtml(requestUrl)}" style="display:block;padding:16px 20px;border-radius:12px;background:#075392;color:#ffffff;font-weight:800;text-align:center;text-decoration:none;">AVVIA LA RICHIESTA DI NOLEGGIO →</a></p>`
      : "",
    `<h3>Servizi inclusi</h3><ul>${services}</ul>`,
    `<details><summary>Dettagli e condizioni dell'offerta</summary>`,
    `<p>${escapeHtml(promotion.version)} · ${escapeHtml(promotion.fuel)} · Cambio ${escapeHtml(promotion.transmission)} · Colore ${escapeHtml(promotion.color)}</p>`,
    `<p>Noleggiatore: ${escapeHtml(promotion.provider)} · Offerta ${escapeHtml(promotion.offerNumber)} · Valida fino al ${escapeHtml(promotion.validUntil)}</p>`,
    `<ul>${warnings}</ul></details>`,
    `<p><small>Immagine illustrativa. La richiesta non costituisce acquisto né approvazione del contratto di noleggio.</small></p>`,
    cover.attribution
      ? `<p><small>Fonte immagine: ${cover.sourceUrl ? `<a href="${escapeHtml(cover.sourceUrl)}">${escapeHtml(cover.attribution)}</a>` : escapeHtml(cover.attribution)}.</small></p>`
      : "",
  ].filter(Boolean).join("");
}

async function stageProductImage(cover: ProductCover) {
  const data = await graphql<{
    stagedUploadsCreate: {
      stagedTargets: Array<{ url: string; resourceUrl: string; parameters: Array<{ name: string; value: string }> }>;
      userErrors: Array<{ message: string }>;
    };
  }>(`mutation StageProductImage($input: [StagedUploadInput!]!) {
    stagedUploadsCreate(input: $input) {
      stagedTargets { url resourceUrl parameters { name value } }
      userErrors { field message }
    }
  }`, {
    input: [{ filename: cover.filename, mimeType: cover.mimeType, httpMethod: "POST", resource: "PRODUCT_IMAGE" }],
  });
  const errors = data.stagedUploadsCreate.userErrors;
  if (errors.length) throw new Error(errors.map((error) => error.message).join(" · "));
  const target = data.stagedUploadsCreate.stagedTargets[0];
  if (!target) throw new Error("Shopify non ha preparato il caricamento dell'immagine.");

  const body = new FormData();
  target.parameters.forEach(({ name, value }) => body.append(name, value));
  body.append("file", new Blob([cover.bytes], { type: cover.mimeType }), cover.filename);
  const upload = await fetch(target.url, { method: "POST", body });
  if (!upload.ok) throw new Error(`Caricamento immagine Shopify non riuscito (${upload.status}).`);
  return target.resourceUrl;
}

function productInput(
  promotion: ShopifyPromotion,
  status: "DRAFT" | "ACTIVE",
  templateSuffix: string,
  requestBaseUrl: string,
  cover: ProductCover,
) {
  return {
    title: titleFor(promotion),
    descriptionHtml: descriptionFor(promotion, requestBaseUrl, cover),
    productType: "Noleggio a lungo termine",
    vendor: "ECCOMI NOLEGGIO",
    status,
    templateSuffix,
    seo: {
      title: `${promotion.brand} ${promotion.model} a noleggio lungo termine`,
      description: `${euro(promotion.monthlyGrossCents)}/mese, ${promotion.durationMonths} mesi, ${promotion.totalKm.toLocaleString("it-IT")} km, anticipo ${euro(promotion.depositGrossCents)}.`,
    },
    tags: ["ECCOMI NOLEGGIO", promotion.brand, promotion.provider, `offerta:${promotion.offerNumber}`],
    metafields: [
      { namespace: "eccomi_noleggio", key: "promotion_id", type: "single_line_text_field", value: promotion.id },
      { namespace: "eccomi_noleggio", key: "offer_number", type: "single_line_text_field", value: promotion.offerNumber },
      { namespace: "eccomi_noleggio", key: "valid_until", type: "date", value: promotion.validUntil },
      { namespace: "eccomi_noleggio", key: "monthly_gross_cents", type: "number_integer", value: String(promotion.monthlyGrossCents) },
      { namespace: "eccomi_noleggio", key: "deposit_gross_cents", type: "number_integer", value: String(promotion.depositGrossCents) },
      { namespace: "eccomi_noleggio", key: "duration_months", type: "number_integer", value: String(promotion.durationMonths) },
      { namespace: "eccomi_noleggio", key: "total_km", type: "number_integer", value: String(promotion.totalKm) },
      { namespace: "eccomi_noleggio", key: "delivery", type: "single_line_text_field", value: promotion.delivery || "Da confermare" },
      { namespace: "eccomi_noleggio", key: "fuel", type: "single_line_text_field", value: promotion.fuel || "Da confermare" },
      { namespace: "eccomi_noleggio", key: "transmission", type: "single_line_text_field", value: promotion.transmission || "Da confermare" },
      { namespace: "eccomi_noleggio", key: "services", type: "json", value: JSON.stringify(promotion.services) },
      { namespace: "eccomi_noleggio", key: "warnings", type: "json", value: JSON.stringify(promotion.warnings) },
      ...(requestBaseUrl ? [{ namespace: "eccomi_noleggio", key: "request_url", type: "url", value: requestBaseUrl }] : []),
    ],
  };
}

async function collectionState(config: ShopifyConfiguration, productId: string) {
  return graphqlWithConfiguration<{
    collectionByHandle: {
      id: string;
      handle: string;
      title: string;
      hasProduct: boolean;
      publishedOnPublication: boolean;
      ruleSet: { rules: Array<{ column: string; relation: string; condition: string }> } | null;
    } | null;
  }>(config, `query EccomiNoleggioCollection($handle: String!, $productId: ID!, $publicationId: ID!) {
    collectionByHandle(handle: $handle) {
      id
      handle
      title
      hasProduct(id: $productId)
      publishedOnPublication(publicationId: $publicationId)
      ruleSet { rules { column relation condition } }
    }
  }`, {
    handle: config.collectionHandle,
    productId,
    publicationId: config.publicationId,
  });
}

async function ensureNoleggioCollection(config: ShopifyConfiguration, productId: string) {
  let state = await collectionState(config, productId);
  let collection = state.collectionByHandle;
  if (!collection) {
    const created = await graphqlWithConfiguration<{
      collectionCreate: {
        collection: { id: string; handle: string; title: string } | null;
        userErrors: Array<{ message: string }>;
      };
    }>(config, `mutation CreateEccomiNoleggioCollection($input: CollectionInput!) {
      collectionCreate(input: $input) {
        collection { id handle title }
        userErrors { field message }
      }
    }`, {
      input: {
        title: "Eccomi Noleggio",
        handle: config.collectionHandle,
        descriptionHtml: "<p>Offerte di noleggio a lungo termine verificate da ECCOMI.</p>",
      },
    });
    if (created.collectionCreate.userErrors.length) {
      throw new Error(created.collectionCreate.userErrors.map((error) => error.message).join(" · "));
    }
    if (!created.collectionCreate.collection) throw new Error("Shopify non ha creato la collezione Eccomi Noleggio.");
    state = await collectionState(config, productId);
    collection = state.collectionByHandle;
  }
  if (!collection) throw new Error("Collezione Eccomi Noleggio non disponibile.");

  if (!collection.hasProduct && !collection.ruleSet) {
    const added = await graphqlWithConfiguration<{
      collectionAddProducts: {
        collection: { id: string } | null;
        userErrors: Array<{ message: string }>;
      };
    }>(config, `mutation AddEccomiNoleggioProduct($id: ID!, $productIds: [ID!]!) {
      collectionAddProducts(id: $id, productIds: $productIds) {
        collection { id }
        userErrors { field message }
      }
    }`, { id: collection.id, productIds: [productId] });
    if (added.collectionAddProducts.userErrors.length) {
      throw new Error(added.collectionAddProducts.userErrors.map((error) => error.message).join(" · "));
    }
  }

  if (!collection.publishedOnPublication) {
    const published = await graphqlWithConfiguration<{
      publishablePublish: { userErrors: Array<{ message: string }> };
    }>(config, `mutation PublishEccomiNoleggioCollection($id: ID!, $publicationId: ID!) {
      publishablePublish(id: $id, input: { publicationId: $publicationId }) {
        userErrors { field message }
      }
    }`, { id: collection.id, publicationId: config.publicationId });
    if (published.publishablePublish.userErrors.length) {
      throw new Error(published.publishablePublish.userErrors.map((error) => error.message).join(" · "));
    }
  }

  state = await collectionState(config, productId);
  let verified = state.collectionByHandle;
  for (let attempt = 0; verified?.ruleSet && !verified.hasProduct && attempt < 4; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    state = await collectionState(config, productId);
    verified = state.collectionByHandle;
  }
  if (!verified) throw new Error("Shopify non ha confermato la collezione Eccomi Noleggio.");
  if (!verified.hasProduct) {
    throw new Error("Il prodotto non rispetta le regole della collezione automatica Eccomi Noleggio.");
  }
  return {
    id: verified.id,
    handle: verified.handle,
    title: verified.title,
  };
}

async function configureRentalProductVariants(
  config: ShopifyConfiguration,
  productId: string,
  knownVariantIds: string[] = [],
) {
  let variantIds = knownVariantIds.filter(Boolean);

  if (!variantIds.length) {
    const productData = await graphqlWithConfiguration<{
      product: { variants: { nodes: Array<{ id: string }> } } | null;
    }>(config, `query RentalProductVariants($id: ID!) {
      product(id: $id) {
        variants(first: 100) { nodes { id } }
      }
    }`, { id: productId });
    variantIds = productData.product?.variants.nodes.map((variant) => variant.id) || [];
  }

  if (!variantIds.length) throw new Error("Shopify non ha restituito la variante del prodotto.");

  const updated = await graphqlWithConfiguration<{
    productVariantsBulkUpdate: {
      productVariants: Array<{
        id: string;
        price: string;
        taxable: boolean;
        inventoryItem: { requiresShipping: boolean; tracked: boolean };
      }>;
      userErrors: Array<{ message: string }>;
    };
  }>(config, `mutation ConfigureRentalProductVariants($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      productVariants {
        id
        price
        taxable
        inventoryItem { requiresShipping tracked }
      }
      userErrors { field message }
    }
  }`, {
    productId,
    variants: variantIds.map((id) => ({
      id,
      price: "0.00",
      taxable: true,
      inventoryPolicy: "DENY",
      inventoryItem: {
        requiresShipping: false,
        tracked: false,
      },
    })),
  });

  if (updated.productVariantsBulkUpdate.userErrors.length) {
    throw new Error(updated.productVariantsBulkUpdate.userErrors.map((error) => error.message).join(" · "));
  }

  const incomplete = updated.productVariantsBulkUpdate.productVariants.find((variant) => (
    variant.price !== "0.00"
    || variant.inventoryItem.requiresShipping
    || variant.inventoryItem.tracked
  ));
  if (incomplete) throw new Error("Shopify non ha applicato tutte le regole ECCOMI NOLEGGIO al prodotto.");
}

export async function createPromotionDraftOnShopify(promotion: ShopifyPromotion, cover: ProductCover) {
  const config = await configuration();
  const imageSource = await stageProductImage(cover);
  const created = await graphqlWithConfiguration<{
    productCreate: {
      product: { id: string; handle: string; variants: { nodes: Array<{ id: string }> } } | null;
      userErrors: Array<{ message: string }>;
    };
  }>(config, `mutation CreateNoleggioProduct($product: ProductCreateInput!, $media: [CreateMediaInput!]) {
    productCreate(product: $product, media: $media) {
      product { id handle variants(first: 100) { nodes { id } } }
      userErrors { field message }
    }
  }`, {
    product: productInput(promotion, "DRAFT", config.templateSuffix, config.requestBaseUrl, cover),
    media: [{ originalSource: imageSource, mediaContentType: "IMAGE", alt: `${promotion.brand} ${promotion.model} – immagine illustrativa` }],
  });
  if (created.productCreate.userErrors.length) {
    throw new Error(created.productCreate.userErrors.map((error) => error.message).join(" · "));
  }
  const product = created.productCreate.product;
  if (!product) throw new Error("Shopify non ha restituito il prodotto creato.");

  await configureRentalProductVariants(
    config,
    product.id,
    product.variants.nodes.map((variant) => variant.id),
  );

  return {
    productId: product.id,
    handle: product.handle,
    adminUrl: `https://${config.shop}/admin/products/${product.id.split("/").pop()}`,
  };
}

export async function publishPreparedPromotionToShopify(productId: string) {
  const config = await configuration();

  // Verifica le regole di noleggio e l'appartenenza alla collezione mentre il
  // prodotto è ancora in bozza. Solo dopo questi controlli diventa pubblico.
  await configureRentalProductVariants(config, productId);
  const collection = await ensureNoleggioCollection(config, productId);

  const updated = await graphqlWithConfiguration<{
    productUpdate: {
      product: { id: string; handle: string } | null;
      userErrors: Array<{ message: string }>;
    };
  }>(config, `mutation ActivateNoleggioProduct($product: ProductUpdateInput!) {
    productUpdate(product: $product) {
      product { id handle }
      userErrors { field message }
    }
  }`, {
    product: { id: productId, status: "ACTIVE", templateSuffix: config.templateSuffix },
  });
  if (updated.productUpdate.userErrors.length) {
    throw new Error(updated.productUpdate.userErrors.map((error) => error.message).join(" · "));
  }
  const product = updated.productUpdate.product;
  if (!product) throw new Error("Shopify non ha confermato l’attivazione del prodotto.");

  if (!config.publicationAutoPublish) {
    const published = await graphqlWithConfiguration<{
      publishablePublish: { userErrors: Array<{ message: string }> };
    }>(config, `mutation PublishNoleggioProduct($id: ID!, $publicationId: ID!) {
      publishablePublish(id: $id, input: { publicationId: $publicationId }) {
        userErrors { field message }
      }
    }`, { id: product.id, publicationId: config.publicationId });
    if (published.publishablePublish.userErrors.length) {
      throw new Error(published.publishablePublish.userErrors.map((error) => error.message).join(" · "));
    }
  }

  return {
    productId: product.id,
    handle: product.handle,
    url: `${config.storefrontBaseUrl.replace(/\/$/, "")}/products/${product.handle}`,
    collectionId: collection.id,
    collectionHandle: collection.handle,
  };
}

export async function unpublishPromotionFromShopify(productId: string) {
  const config = await configuration();
  const data = await graphqlWithConfiguration<{
    publishableUnpublish: { userErrors: Array<{ message: string }> };
  }>(config, `mutation UnpublishNoleggioProduct($id: ID!, $publicationId: ID!) {
    publishableUnpublish(id: $id, input: { publicationId: $publicationId }) {
      userErrors { field message }
    }
  }`, { id: productId, publicationId: config.publicationId });
  if (data.publishableUnpublish.userErrors.length) {
    throw new Error(data.publishableUnpublish.userErrors.map((error) => error.message).join(" · "));
  }
}
