import { eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { promotions } from "../../../../../db/schema";
import { isPartnerNoleggioRole } from "../../../../lib/permissions";
import { requireActor, routeError } from "../../../../lib/server/authz";
import { storageGet } from "../../../../lib/server/storage";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireActor(request);
    const { id } = await context.params;
    const [promotion] = await getDb().select().from(promotions).where(eq(promotions.id, id)).limit(1);
    if (!promotion || !promotion.quoteKey) return Response.json({ error: "PDF non disponibile." }, { status: 404 });
    if (isPartnerNoleggioRole(actor.role) && actor.partnerId !== promotion.partnerId) {
      return Response.json({ error: "Documento non autorizzato." }, { status: 403 });
    }
    const object = await storageGet(promotion.quoteKey);
    if (!object) return Response.json({ error: "PDF non disponibile." }, { status: 404 });
    return new Response(object.bytes, {
      headers: {
        "content-type": object.contentType || "application/pdf",
        "content-disposition": `inline; filename="${(promotion.quoteFileName || "quotazione.pdf").replace(/["\r\n]/g, "")}"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    return routeError(error);
  }
}
