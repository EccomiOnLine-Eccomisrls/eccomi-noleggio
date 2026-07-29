import { shopifyAdminFetch } from "./shopify";

type EditorialPromotion = {
  id: string;
  brand: string;
  model: string;
  version: string;
  monthlyGrossCents: number;
  depositGrossCents: number;
  durationMonths: number;
  totalKm: number;
  delivery: string;
  services: string[];
};

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] || character);
}

function clean(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function titleFor(promotion: EditorialPromotion) {
  const brand = clean(promotion.brand).toUpperCase();
  const model = clean(promotion.model);
  const version = clean(promotion.version);
  const base = `${brand} ${model}`.trim();

  if (!version || base.toLowerCase().includes(version.toLowerCase())) {
    return base;
  }

  return `${base} ${version}`.trim();
}

function deliveryFor(value: string) {
  const normalized = clean(value);
  const match = normalized.match(/\b(\d{1,3})\s*(giorni|settimane|mesi)\b/i);
  return match ? `${match[1]} ${match[2].toLowerCase()}` : normalized || "Da confermare";
}

function serviceGroups(services: string[]) {
  const text = services.join(" ").toLowerCase();
  const groups: string[] = [];

  if (/rca|furto|incendio|kasko|assicur|infortuni|tutela legale/.test(text)) {
    groups.push("🛡️ Coperture assicurative previste dall’offerta");
  }
  if (/manutenzione|assistenza|soccorso|stradale/.test(text)) {
    groups.push("🔧 Manutenzione e assistenza");
  }
  if (/pneumatic|gomme/.test(text)) {
    groups.push("🛞 Pneumatici secondo contratto");
  }
  if (/sostitutiv|mobilità|veicolo sostitutivo/.test(text)) {
    groups.push("🚘 Veicolo sostitutivo e servizi di mobilità");
  }

  const defaults = [
    "🛡️ Coperture assicurative previste dall’offerta",
    "🔧 Manutenzione e assistenza",
    "🛞 Pneumatici secondo contratto",
    "🚘 Supporto durante la pratica di noleggio",
  ];

  for (const item of defaults) {
    if (groups.length >= 4) break;
    if (!groups.includes(item)) groups.push(item);
  }

  return groups.slice(0, 4);
}

function descriptionFor(promotion: EditorialPromotion) {
  const title = titleFor(promotion);
  const services = serviceGroups(promotion.services)
    .map((service) => `<li>${escapeHtml(service)}</li>`)
    .join("");

  return [
    `<p><strong>${escapeHtml(title)}</strong> è disponibile con una proposta di noleggio a lungo termine gestita attraverso ECCOMI NOLEGGIO.</p>`,
    `<h3>✅ Cosa comprende l’offerta</h3>`,
    `<ul>${services}</ul>`,
    `<p><small>Consegna indicativa: ${escapeHtml(deliveryFor(promotion.delivery))}. La richiesta non costituisce acquisto né approvazione del contratto di noleggio.</small></p>`,
  ].join("");
}

export async function applyEccomiEditorialRules(input: {
  productId: string;
  promotion: EditorialPromotion;
}) {
  const title = titleFor(input.promotion);
  const descriptionHtml = descriptionFor(input.promotion);

  const result = await shopifyAdminFetch<{
    productUpdate: {
      product: { id: string; title: string; status: string; templateSuffix: string | null } | null;
      userErrors: Array<{ field?: string[]; message: string }>;
    };
  }>(
    `mutation ApplyEccomiEditorialRules($product: ProductUpdateInput!) {
      productUpdate(product: $product) {
        product {
          id
          title
          status
          templateSuffix
        }
        userErrors {
          field
          message
        }
      }
    }`,
    {
      product: {
        id: input.productId,
        title,
        descriptionHtml,
        status: "DRAFT",
        templateSuffix: "eccomi-noleggio",
        seo: {
          title: `${title} | ECCOMI NOLEGGIO`,
          description: `${title}: offerta di noleggio a lungo termine. Anticipo, durata, chilometri e consegna sono riportati nella scheda.`,
        },
      },
    },
  );

  if (result.productUpdate.userErrors.length) {
    throw new Error(result.productUpdate.userErrors.map((error) => error.message).join(" · "));
  }

  if (!result.productUpdate.product) {
    throw new Error("Shopify non ha confermato l’aggiornamento editoriale della bozza.");
  }

  return {
    title,
    delivery: deliveryFor(input.promotion.delivery),
    status: result.productUpdate.product.status,
    templateSuffix: result.productUpdate.product.templateSuffix,
  };
}
