import { getShopifyConnectionStatus } from "./shopify";

export async function publicCorsOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return null;

  const allowed = new Set<string>([
    new URL(request.url).origin,
    "https://eccomionline.com",
    "https://www.eccomionline.com",
    "https://noleggio.eccomionline.com",
    "https://www.noleggio.eccomionline.com",
  ]);

  try {
    const shopify = await getShopifyConnectionStatus();
    if (shopify.shopDomain) allowed.add(`https://${shopify.shopDomain}`);
    if (shopify.storefrontUrl) allowed.add(new URL(shopify.storefrontUrl).origin);
  } catch {
    // The fixed storefront origins remain available if the integration lookup is temporarily unavailable.
  }

  return allowed.has(origin) ? origin : null;
}

export function corsHeaders(origin: string | null) {
  const headers = new Headers({
    "cache-control": "no-store",
    "vary": "Origin",
  });
  if (origin) {
    headers.set("access-control-allow-origin", origin);
    headers.set("access-control-allow-methods", "GET, POST, OPTIONS");
    headers.set("access-control-allow-headers", "content-type, idempotency-key");
    headers.set("access-control-max-age", "600");
  }
  return headers;
}

export function jsonWithCors(payload: unknown, status: number, origin: string | null) {
  const headers = corsHeaders(origin);
  headers.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(payload), { status, headers });
}
