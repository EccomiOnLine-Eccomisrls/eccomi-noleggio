import { eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { auditLogs, promotions } from "../../../../../db/schema";
import { requireActor, routeError } from "../../../../lib/server/authz";
import { storageDelete, storageGet, storagePut } from "../../../../lib/server/storage";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_COVER_BYTES = 8 * 1024 * 1024;

async function promotionForActor(request: Request, id: string) {
  const actor = await requireActor(request);
  const [promotion] = await getDb().select().from(promotions).where(eq(promotions.id, id)).limit(1);
  if (!promotion) throw new Response(JSON.stringify({ error: "Promozione non trovata." }), { status: 404, headers: { "content-type": "application/json" } });
  if (actor.role === "PARTNER" && actor.partnerId !== promotion.partnerId) {
    throw new Response(JSON.stringify({ error: "Promozione non autorizzata." }), { status: 403, headers: { "content-type": "application/json" } });
  }
  return { actor, promotion };
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { promotion } = await promotionForActor(request, id);
    if (!promotion.coverKey) return Response.json({ error: "Immagine non disponibile." }, { status: 404 });
    if (promotion.coverKey.startsWith("asset:")) {
      const path = promotion.coverKey.slice("asset:".length);
      return fetch(new URL(path, request.url));
    }
    const object = await storageGet(promotion.coverKey);
    if (!object) return Response.json({ error: "Immagine non disponibile." }, { status: 404 });
    return new Response(object.bytes, {
      headers: {
        "content-type": object.contentType || "application/octet-stream",
        "cache-control": "private, max-age=300",
      },
    });
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { actor, promotion } = await promotionForActor(request, id);
    const formData = await request.formData();
    const cover = formData.get("cover");
    if (!(cover instanceof File)) return Response.json({ error: "Immagine mancante." }, { status: 400 });
    if (!ALLOWED_TYPES.has(cover.type)) return Response.json({ error: "Usa un'immagine PNG, JPG o WebP." }, { status: 400 });
    if (cover.size <= 0 || cover.size > MAX_COVER_BYTES) return Response.json({ error: "L'immagine deve pesare meno di 8 MB." }, { status: 400 });
    const extension = cover.type === "image/png" ? "png" : cover.type === "image/webp" ? "webp" : "jpg";
    const key = `covers/${promotion.partnerId}/${id}/shopify-cover.${extension}`;
    await storagePut(
      key,
      await cover.arrayBuffer(),
      cover.type,
    );
    const oldKey = promotion.coverKey && !promotion.coverKey.startsWith("asset:") ? promotion.coverKey : null;
    await getDb().update(promotions).set({ coverKey: key, updatedAt: new Date().toISOString() }).where(eq(promotions.id, id));
    if (oldKey && oldKey !== key) {
      await storageDelete(oldKey);
    }
    await getDb().insert(auditLogs).values({
      id: crypto.randomUUID(),
      actorEmail: actor.email,
      action: "PROMOTION_COVER_UPLOADED",
      entityType: "promotion",
      entityId: id,
      payloadJson: JSON.stringify({ contentType: cover.type, size: cover.size }),
    });
    return Response.json({ ok: true, image: `/api/promotions/${id}/cover` });
  } catch (error) {
    return routeError(error);
  }
}
