import { and, eq, gt, inArray, lte } from "drizzle-orm";
import { getDb } from "../../../../db";
import { auditLogs, promotions } from "../../../../db/schema";
import { getRuntimeEnv } from "../../../lib/server/runtime";
import { isShopifyConfigured, unpublishPromotionFromShopify } from "../../../lib/server/shopify";

function romeDate(offsetDays = 0) {
  const date = new Date(Date.now() + offsetDays * 86_400_000);
  return date.toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
}

export async function POST(request: Request) {
  const secret = getRuntimeEnv().CRON_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!secret || !supplied || supplied !== secret) return Response.json({ error: "Non autorizzato." }, { status: 401 });

  const db = getDb();
  const today = romeDate();
  const tomorrow = romeDate(1);
  const expiring = await db.select().from(promotions).where(and(
    gt(promotions.validUntil, today),
    lte(promotions.validUntil, tomorrow),
    inArray(promotions.status, ["ONLINE", "ACTIVE"]),
  ));
  for (const promotion of expiring) {
    await db.update(promotions).set({ status: "EXPIRING", updatedAt: new Date().toISOString() }).where(eq(promotions.id, promotion.id));
    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      actorEmail: "system@eccomi.local",
      action: "PROMOTION_EXPIRY_24H_ALERT",
      entityType: "promotion",
      entityId: promotion.id,
      payloadJson: JSON.stringify({ validUntil: promotion.validUntil }),
    });
  }

  const stale = await db.select().from(promotions).where(and(
    lte(promotions.validUntil, today),
    inArray(promotions.status, ["PENDING_APPROVAL", "APPROVED", "ONLINE", "ACTIVE", "EXPIRING"]),
  ));
  const errors: Array<{ id: string; error: string }> = [];
  let expired = 0;
  for (const promotion of stale) {
    try {
      if (promotion.shopifyProductId && await isShopifyConfigured()) {
        await unpublishPromotionFromShopify(promotion.shopifyProductId);
      }
      await db.update(promotions).set({ status: "EXPIRED", updatedAt: new Date().toISOString() }).where(eq(promotions.id, promotion.id));
      await db.insert(auditLogs).values({
        id: crypto.randomUUID(),
        actorEmail: "system@eccomi.local",
        action: "PROMOTION_EXPIRED_AUTOMATICALLY",
        entityType: "promotion",
        entityId: promotion.id,
        payloadJson: JSON.stringify({ validUntil: promotion.validUntil, shopifyUnpublished: Boolean(promotion.shopifyProductId) }),
      });
      expired += 1;
    } catch (error) {
      errors.push({ id: promotion.id, error: error instanceof Error ? error.message : "Errore inatteso" });
    }
  }

  return Response.json({ ok: errors.length === 0, expiring: expiring.length, expired, errors }, { status: errors.length ? 207 : 200 });
}
