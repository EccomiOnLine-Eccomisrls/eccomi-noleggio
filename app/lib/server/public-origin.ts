import { getShopifyConnectionStatus } from "./shopify";

function normalizedOrigin(value: string | null | undefined) {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export async function publicCorsOrigin(request: Request) {
  const origin = normalizedOrigin(request.headers.get("origin"));
  if (!origin) return null;

  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const requestOrigin = normalizedOrigin(request.url);
  const forwardedOrigin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : null;

  const allowed = new Set<string>([
    "https://eccomi-noleggio.onrender.com",
    "https://eccomionline.com",
    "https://www.eccomionline.com",
    "https://noleggio.eccomionline.com",
    "https://www.noleggio.eccomionline.com",
  ]);

  if (requestOrigin) allowed.add(requestOrigin);
  if (forwardedOrigin) allowed.add(forwardedOrigin);

  try {
    const shopify = await getShopifyConnectionStatus();
    if (shopify.shopDomain) allowed.add(`https://${shopify.shopDomain}`);
    if (shopify.storefrontUrl) {
      const storefrontOrigin = normalizedOrigin(shopify.storefrontUrl);
      if (storefrontOrigin) allowed.add(storefrontOrigin);
    }
  } catch {
    // Le origini pubbliche fisse restano disponibili se Shopify non risponde.
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
