import { getDb } from "../../../../db";
import { auditLogs } from "../../../../db/schema";
import { requireCeo, routeError } from "../../../lib/server/authz";
import { connectShopifyIntegration, getShopifyConnectionStatus } from "../../../lib/server/shopify";

function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  if (new URL(origin).host !== new URL(request.url).host) {
    throw new Response(JSON.stringify({ error: "Richiesta non autorizzata." }), {
      status: 403,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }
}

export async function GET(request: Request) {
  try {
    await requireCeo(request);
    return Response.json({ shopify: await getShopifyConnectionStatus() });
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const actor = await requireCeo(request);
    const body = await request.json() as { shopDomain?: unknown; clientId?: unknown; clientSecret?: unknown };
    const shopDomain = typeof body.shopDomain === "string" ? body.shopDomain : "";
    const clientId = typeof body.clientId === "string" ? body.clientId : "";
    const clientSecret = typeof body.clientSecret === "string" ? body.clientSecret : "";
    const shopify = await connectShopifyIntegration({ shopDomain, clientId, clientSecret, actorEmail: actor.email });
    await getDb().insert(auditLogs).values({
      id: crypto.randomUUID(),
      actorEmail: actor.email,
      action: "SHOPIFY_CONNECTED",
      entityType: "integration",
      entityId: "shopify-primary",
      payloadJson: JSON.stringify({ shopDomain: shopify.shopDomain, verifiedAt: shopify.verifiedAt }),
    });
    return Response.json({ ok: true, shopify });
  } catch (error) {
    return routeError(error);
  }
}
