import { eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { promotions } from "../../../../../db/schema";
import { requireActor, routeError } from "../../../../lib/server/authz";
import { getRuntimeEnv } from "../../../../lib/server/runtime";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireActor(request);
    const { id } = await context.params;
    const [promotion] = await getDb().select().from(promotions).where(eq(promotions.id, id)).limit(1);
    if (!promotion || !promotion.quoteKey) return Response.json({ error: "PDF non disponibile." }, { status: 404 });
    if (actor.role === "PARTNER" && actor.partnerId !== promotion.partnerId) {
      return Response.json({ error: "Documento non autorizzato." }, { status: 403 });
    }
    const object = await getRuntimeEnv().BUCKET.get(promotion.quoteKey);
    if (!object) return Response.json({ error: "PDF non disponibile." }, { status: 404 });
    return new Response(object.body, {
      headers: {
        "content-type": object.httpMetadata?.contentType || "application/pdf",
        "content-disposition": `inline; filename="${(promotion.quoteFileName || "quotazione.pdf").replace(/["\r\n]/g, "")}"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    return routeError(error);
  }
}
