export type AttributionInput = {
  source?: unknown;
  entry?: unknown;
  campaign?: unknown;
  adGroup?: unknown;
  ad?: unknown;
};

export type AttributionPayload = {
  attributionSource: string;
  entrySource: string;
  campaignKey: string;
  adGroupKey: string;
  adKey: string;
};

const tokenPattern = /^[a-z0-9][a-z0-9._:-]*$/i;

export function attributionToken(
  value: unknown,
  maximum = 80,
) {
  if (typeof value !== "string") return "";

  const normalized = value.trim().toLowerCase().slice(0, maximum);

  if (!normalized || !tokenPattern.test(normalized)) {
    return "";
  }

  return normalized;
}

export function normalizeAttribution(
  input: AttributionInput,
  fallbackSource = "direct",
  fallbackEntry = "direct",
): AttributionPayload {
  return {
    attributionSource:
      attributionToken(input.source, 80)
      || attributionToken(fallbackSource, 80)
      || "direct",
    entrySource:
      attributionToken(input.entry, 80)
      || attributionToken(fallbackEntry, 80)
      || "direct",
    campaignKey: attributionToken(input.campaign, 120),
    adGroupKey: attributionToken(input.adGroup, 120),
    adKey: attributionToken(input.ad, 120),
  };
}

export function legacyRequestSource(
  attributionSource: string,
  fallback:
    | "ECCOMI_NOLEGGIO_CUSTOM_REQUEST"
    | "ECCOMI_NOLEGGIO_WEB",
) {
  if (
    attributionSource === "ads"
    || attributionSource === "openai-ads"
    || attributionSource === "ads-landing"
  ) {
    return "ECCOMI_NOLEGGIO_ADS";
  }

  if (attributionSource === "shopify-product") {
    return "ECCOMI_NOLEGGIO_SHOPIFY_PRODUCT";
  }

  if (attributionSource === "shopify-landing") {
    return "ECCOMI_NOLEGGIO_SHOPIFY_LANDING";
  }

  return fallback;
}

export function attributionSourceFromLegacy(
  legacySource: string | null | undefined,
  fallback = "direct",
) {
  if (legacySource === "ECCOMI_NOLEGGIO_ADS") {
    return "openai-ads";
  }

  if (legacySource === "ECCOMI_NOLEGGIO_SHOPIFY_PRODUCT") {
    return "shopify-product";
  }

  if (legacySource === "ECCOMI_NOLEGGIO_SHOPIFY_LANDING") {
    return "shopify-landing";
  }

  return fallback;
}

export function entrySourceFromLegacy(
  legacySource: string | null | undefined,
  fallback = "direct",
) {
  if (legacySource === "ECCOMI_NOLEGGIO_SHOPIFY_PRODUCT") {
    return "shopify-product";
  }

  if (legacySource === "ECCOMI_NOLEGGIO_SHOPIFY_LANDING") {
    return "shopify-landing";
  }

  return fallback;
}
