function isoDateFromNow(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export const previewPromotionEditable = {
  id: "preview-peugeot-3008",
  offerNumber: "PREVIEW-3008",
  brand: "PEUGEOT",
  model: "3008",
  version: "3008 Hybrid 145 e-DCS6 Allure Business",
  provider: "Partner demo ECCOMI",
  monthlyGrossCents: 56113,
  depositGrossCents: 0,
  durationMonths: 36,
  totalKm: 60000,
  validUntil: isoDateFromNow(5),
  delivery: "22 settimane",
  fuel: "Hybrid",
  transmission: "Automatico e-DCS6",
  color: "Grigio",
  services: [
    "Manutenzione ordinaria e straordinaria",
    "Assistenza stradale",
    "Coperture assicurative previste dall'offerta",
  ],
  warnings: [
    "Immagine illustrativa",
    "Offerta soggetta a disponibilità e approvazione",
  ],
  status: "ONLINE",
  shopifyProductId: "gid://shopify/Product/PREVIEW3008",
  shopifyUrl: "https://eccomionline.com/products/peugeot-3008-preview",
  updatedAt: new Date().toISOString(),
};

export function previewDashboardPayload() {
  const p = previewPromotionEditable;
  return {
    preview: true,
    readOnly: true,
    user: {
      email: "preview-ceo@eccomi.local",
      displayName: "Salvatore Del Libano",
      role: "CEO",
      partnerId: null,
    },
    promotions: [
      {
        id: p.id,
        offerNumber: p.offerNumber,
        brand: p.brand,
        model: p.model,
        owner: "ECCOMI diretto",
        source: "Preview sicura PR #3",
        rental: p.provider,
        price: "561,13 €",
        deposit: "0,00 €",
        term: `${p.durationMonths} mesi`,
        mileage: "60.000 km",
        expires: new Intl.DateTimeFormat("it-IT", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          timeZone: "Europe/Rome",
        }).format(new Date(`${p.validUntil}T12:00:00Z`)),
        validUntil: p.validUntil,
        days: "5 giorni",
        image: null,
        accent: "blue",
        version: p.version,
        fuel: p.fuel,
        transmission: p.transmission,
        color: p.color,
        delivery: p.delivery,
        services: p.services,
        warnings: p.warnings,
        status: "ONLINE",
        statusLabel: "ONLINE",
        quoteStored: false,
        shopifyProductId: p.shopifyProductId,
        shopifyPrepared: true,
        shopifyUrl: p.shopifyUrl,
        shopifyCollectionId: null,
        automationStatus: "ONLINE",
        automationError: null,
        extractionMethod: "PREVIEW_FIXTURE",
        coverSourceKind: null,
        coverAttribution: null,
        updatedAt: p.updatedAt,
      },
    ],
    leads: [],
    integrations: {
      shopify: {
        connected: true,
        publishingReady: false,
        shopDomain: "eccomionline.com",
        shopName: "ECCOMI ONLINE · PREVIEW",
        storefrontUrl: "https://eccomionline.com",
        publicationLabel: "SIMULAZIONE",
        clientIdHint: null,
        verifiedAt: new Date().toISOString(),
      },
      ai: {
        connected: true,
        textModel: "gpt-5.6-terra",
        imageModel: "gpt-image-2",
        verifiedAt: new Date().toISOString(),
        source: "environment",
      },
    },
    hubEvents: [
      {
        id: "preview-event-1",
        eventType: "NOLEGGIO_PROMOTION_ATTENTION_7D",
        title: "PEUGEOT 3008: DA ATTENZIONARE",
        actorEmail: "system@eccomi.local",
        createdAt: new Date().toISOString(),
      },
    ],
    stats: {
      promotions: 1,
      pendingApproval: 0,
      approved: 0,
      active: 1,
      expired: 0,
      leads: 0,
      newLeads: 0,
      commissionCents: 0,
    },
  };
}
