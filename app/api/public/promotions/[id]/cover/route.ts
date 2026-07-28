import { eq } from "drizzle-orm";
import { getDb } from "../../../../../../db";
import { promotions } from "../../../../../../db/schema";
import { corsHeaders, jsonWithCors, publicCorsOrigin } from "../../../../../lib/server/public-origin";
import { storageGet } from "../../../../../lib/server/storage";

export async function OPTIONS(request: Request) {
  const origin = await publicCorsOrigin(request);
  if (!origin) return jsonWithCors({ error: "Origine non autorizzata." }, 403, null);
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const origin = await publicCorsOrigin(request);
  const sameOrigin = !request.headers.get("origin") || origin === new URL(request.url).origin;
  if (!sameOrigin && !origin) return jsonWithCors({ error: "Origine non autorizzata." }, 403, null);

  const { id } = await context.params;
  const [promotion] = await getDb().select().from(promotions).where(eq(promotions.id, id)).limit(1);
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
  if (!promotion || !promotion.coverKey || !["ONLINE", "ACTIVE", "EXPIRING"].includes(promotion.status) || promotion.validUntil < today) {
    return jsonWithCors({ error: "Immagine non disponibile." }, 404, origin);
  }

  let response: Response;
  if (promotion.coverKey.startsWith("asset:")) {
    const path = promotion.coverKey.slice("asset:".length);
    response = await fetch(new URL(path, request.url));
  } else {
    const object = await storageGet(promotion.coverKey);
    if (!object) return jsonWithCors({ error: "Immagine non disponibile." }, 404, origin);
    response = new Response(object.bytes, {
      headers: { "content-type": object.contentType || "application/octet-stream" },
    });
  }

  const headers = new Headers(response.headers);
  headers.set("cache-control", "public, max-age=900");
  if (origin) headers.set("access-control-allow-origin", origin);
  headers.set("vary", "Origin");
  return new Response(response.body, { status: response.status, headers });
}
