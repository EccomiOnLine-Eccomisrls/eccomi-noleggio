import { shopifyAdminFetch } from "./shopify";
import { getRuntimeEnv } from "./runtime";

type SafeShopifyPromotion = {
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

type SafeShopifyUpdateOptions = {
  status?: "ACTIVE" | "DRAFT" | "ARCHIVED";
};

const BENEFITS_VISIBILITY_STYLE = `<style data-eccomi-noleggio-benefits-fix>.multicolumn-card__info h3,.multicolumn-card__info h3 *,.multicolumn-card__info .rte,.multicolumn-card__info .rte *{color:#10253e!important;opacity:1!important;visibility:visible!important}</style>`;

function escapeHtml(value: string) {
  return value.replace(
    /[&<>'\"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '\"': "&quot;",
      })[character] || character,
  );
}

function euro(cents: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function normalizeComparable(value: string) {
  return value
    .trim()
    .toLocaleUpperCase("it-IT")
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function stripPrefix(value: string, prefix: string) {
  const normalizedValue = normalizeComparable(value);
  const normalizedPrefix = normalizeComparable(prefix);
  if (!normalizedValue || !normalizedPrefix || !normalizedValue.startsWith(normalizedPrefix)) {
    return value.trim();
  }

  const sourceWords = value.trim().split(/\s+/);
  const prefixWords = prefix.trim().split(/\s+/);
  return sourceWords.slice(prefixWords.length).join(" ").replace(/^[\s\-–—:|]+/, "").trim();
}

export function publicPromotionTitle(promotion: Pick<SafeShopifyPromotion, "brand" | "model" | "version">) {
  const brand = promotion.brand.trim().toUpperCase();
  const model = promotion.model.trim();
  let version = promotion.version.trim();

  version = stripPrefix(version, `${brand} ${model}`);
  version = stripPrefix(version, model);
  version = stripPrefix(version, brand);

  return [brand, model, version].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
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

function descriptionFor(
  promotion: SafeShopifyPromotion,
  requestBaseUrl: string,
) {
  const services = promotion.services
    .map((service) => `<li>${escapeHtml(service)}</li>`)
    .join("");
  const warnings = promotion.warnings
    .map((warning) => `<li>${escapeHtml(warning)}</li>`)
    .join("");
  const requestUrl = requestUrlFor(requestBaseUrl, promotion.id);
  const publicTitle = publicPromotionTitle(promotion);

  return [
    BENEFITS_VISIBILITY_STYLE,
    `<h2>${escapeHtml(publicTitle)}</h2>`,
    `<p><strong>${euro(promotion.monthlyGrossCents)} al mese IVA inclusa</strong></p>`,
    `<p><strong>Anticipo:</strong> ${euro(promotion.depositGrossCents)} · <strong>Durata:</strong> ${promotion.durationMonths} mesi · <strong>Chilometri:</strong> ${promotion.totalKm.toLocaleString("it-IT")} km</p>`,
    promotion.delivery
      ? `<p><strong>Consegna prevista:</strong> ${escapeHtml(promotion.delivery)}</p>`
      : "",
    requestUrl
      ? `<p style="margin:22px 0;"><a href="${escapeHtml(requestUrl)}" style="display:block;padding:17px 22px;border-radius:12px;background:#075392;color:#ffffff;font-size:16px;font-weight:800;text-align:center;text-decoration:none;">INIZIA LA TUA RICHIESTA →</a></p>`
      : "",
    `<h3>Servizi inclusi</h3><ul>${services}</ul>`,
    `<details><summary>Dettagli e condizioni dell'offerta</summary>`,
    `<p>${escapeHtml(promotion.version)} · ${escapeHtml(promotion.fuel)} · Cambio ${escapeHtml(promotion.transmission)} · Colore ${escapeHtml(promotion.color)}</p>`,
    `<p>Noleggiatore: ${escapeHtml(promotion.provider)} · Offerta ${escapeHtml(promotion.offerNumber)} · Valida fino al ${escapeHtml(promotion.validUntil)}</p>`,
    `<ul>${warnings}</ul></details>`,
    `<p><small>Immagine illustrativa. La richiesta non costituisce acquisto né approvazione del contratto di noleggio.</small></p>`,
  ]
    .filter(Boolean)
    .join("");
}

export async function updatePromotionOnShopifyWithoutUrlMetafields(
  productId: string,
  promotion: SafeShopifyPromotion,
  options: SafeShopifyUpdateOptions = {},
) {
  const runtime = getRuntimeEnv();
  const templateSuffix =
    runtime.SHOPIFY_NOLEGGIO_TEMPLATE_SUFFIX?.trim() ||
    "eccomi-noleggio";
  const requestBaseUrl =
    runtime.PUBLIC_REQUEST_BASE_URL?.trim() ||
    "https://eccomi-noleggio.onrender.com/richiesta";
  const productStatus = options.status || "ACTIVE";
  const publicTitle = publicPromotionTitle(promotion);

  const data = await shopifyAdminFetch<{
    productUpdate: {
      product: {
        id: string;
        handle: string;
        status: string;
      } | null;
      userErrors: Array<{
        field?: string[];
        message: string;
      }>;
    };
  }>(
    `mutation SafeUpdateExistingNoleggioProduct(
      $product: ProductUpdateInput!
    ) {
      productUpdate(product: $product) {
        product {
          id
          handle
          status
        }
        userErrors {
          field
          message
        }
      }
    }`,
    {
      product: {
        id: productId,
        title: publicTitle,
        descriptionHtml: descriptionFor(promotion, requestBaseUrl),
        productType: "Noleggio a lungo termine",
        vendor: "ECCOMI NOLEGGIO",
        status: productStatus,
        templateSuffix,
        seo: {
          title: `${publicTitle} | Noleggio lungo termine`,
          description: `${euro(promotion.monthlyGrossCents)}/mese, ${promotion.durationMonths} mesi, ${promotion.totalKm.toLocaleString("it-IT")} km, anticipo ${euro(promotion.depositGrossCents)}.`,
        },
        tags: [
          "ECCOMI NOLEGGIO",
          promotion.brand,
          promotion.provider,
          `offerta:${promotion.offerNumber}`,
        ],
        metafields: [
          {
            namespace: "eccomi_noleggio",
            key: "promotion_id",
            type: "single_line_text_field",
            value: promotion.id,
          },
          {
            namespace: "eccomi_noleggio",
            key: "offer_number",
            type: "single_line_text_field",
            value: promotion.offerNumber,
          },
          {
            namespace: "eccomi_noleggio",
            key: "valid_until",
            type: "date",
            value: promotion.validUntil,
          },
          {
            namespace: "eccomi_noleggio",
            key: "monthly_gross_cents",
            type: "number_integer",
            value: String(promotion.monthlyGrossCents),
          },
          {
            namespace: "eccomi_noleggio",
            key: "deposit_gross_cents",
            type: "number_integer",
            value: String(promotion.depositGrossCents),
          },
          {
            namespace: "eccomi_noleggio",
            key: "duration_months",
            type: "number_integer",
            value: String(promotion.durationMonths),
          },
          {
            namespace: "eccomi_noleggio",
            key: "total_km",
            type: "number_integer",
            value: String(promotion.totalKm),
          },
          {
            namespace: "eccomi_noleggio",
            key: "delivery",
            type: "single_line_text_field",
            value: promotion.delivery || "Da confermare",
          },
          {
            namespace: "eccomi_noleggio",
            key: "fuel",
            type: "single_line_text_field",
            value: promotion.fuel || "Da confermare",
          },
          {
            namespace: "eccomi_noleggio",
            key: "transmission",
            type: "single_line_text_field",
            value: promotion.transmission || "Da confermare",
          },
          {
            namespace: "eccomi_noleggio",
            key: "services",
            type: "json",
            value: JSON.stringify(promotion.services),
          },
          {
            namespace: "eccomi_noleggio",
            key: "warnings",
            type: "json",
            value: JSON.stringify(promotion.warnings),
          },
        ],
      },
    },
  );

  if (data.productUpdate.userErrors.length) {
    throw new Error(
      data.productUpdate.userErrors
        .map((error) =>
          `${error.field?.join(".") || "prodotto"}: ${error.message}`,
        )
        .join(" · "),
    );
  }

  const product = data.productUpdate.product;

  if (!product) {
    throw new Error(
      "Shopify non ha confermato l’aggiornamento del prodotto.",
    );
  }

  const shopDomain = runtime.SHOPIFY_SHOP_DOMAIN?.trim();
  const storefrontBase = shopDomain
    ? `https://${shopDomain.replace(/^https?:\/\//, "").replace(/\/$/, "")}`
    : "https://eccomionline.com";

  return {
    productId: product.id,
    handle: product.handle,
    status: product.status,
    publicTitle,
    url: `${storefrontBase}/products/${product.handle}`,
    adminUrl: shopDomain
      ? `${storefrontBase}/admin/products/${product.id.split("/").pop()}`
      : null,
  };
}
