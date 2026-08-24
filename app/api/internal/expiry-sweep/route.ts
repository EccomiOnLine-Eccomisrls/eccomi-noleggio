import { and, eq, gt, inArray, lte } from "drizzle-orm";
import { getDb } from "../../../../db";
import { auditLogs, hubEvents, promotions } from "../../../../db/schema";
import { getRuntimeEnv } from "../../../lib/server/runtime";
import { isShopifyConfigured, unpublishPromotionFromShopify } from "../../../lib/server/shopify";

function romeDate(offsetDays = 0) {
  const date = new Date(Date.now() + offsetDays * 86_400_000);
  return date.toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
}

async function insertThresholdAlert(
  promotion: typeof promotions.$inferSelect,
  days: 7 | 3 | 1,
  label: string,
) {
  const db = getDb();
  const action = `PROMOTION_ATTENTION_${days}D_ALERT:${promotion.validUntil}`;
  const [existing] = await db
    .select({ id: auditLogs.id })
    .from(auditLogs)
    .where(and(
      eq(auditLogs.entityType, "promotion"),
      eq(auditLogs.entityId, promotion.id),
      eq(auditLogs.action, action),
    ))
    .limit(1);

  if (existing) return false;

  const now = new Date().toISOString();
  await db.insert(auditLogs).values({
    id: crypto.randomUUID(),
    actorEmail: "system@eccomi.local",
    action,
    entityType: "promotion",
    entityId: promotion.id,
    payloadJson: JSON.stringify({ validUntil: promotion.validUntil, days, label }),
  });

  await db.insert(hubEvents).values({
    id: crypto.randomUUID(),
    eventType: `NOLEGGIO_PROMOTION_ATTENTION_${days}D`,
    ecosystem: "ECCOMI_NOLEGGIO",
    entityType: "promotion",
    entityId: promotion.id,
    title: `${promotion.brand} ${promotion.model}: ${label}`,
    payloadJson: JSON.stringify({
      offerNumber: promotion.offerNumber,
      validUntil: promotion.validUntil,
      days,
      label,
    }),
    actorEmail: "system@eccomi.local",
    createdAt: now,
  });

  return true;
}

export async function POST(request: Request) {
  const secret = getRuntimeEnv().CRON_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!secret || !supplied || supplied !== secret) {
    return Response.json({ error: "Non autorizzato." }, { status: 401 });
  }

  const db = getDb();
  const today = romeDate();
  const attentionLimit = romeDate(7);

  const attentionWindow = await db.select().from(promotions).where(and(
    gt(promotions.validUntil, today),
    lte(promotions.validUntil, attentionLimit),
    inArray(promotions.status, ["ONLINE", "ACTIVE"]),
  ));

  for (const promotion of attentionWindow) {
    await db.update(promotions).set({
      status: "EXPIRING",
      updatedAt: new Date().toISOString(),
    }).where(eq(promotions.id, promotion.id));
  }

  let alerts = 0;
  const thresholds: Array<{ days: 7 | 3 | 1; label: string }> = [
    { days: 7, label: "DA ATTENZIONARE · scade tra 7 giorni" },
    { days: 3, label: "PRIORITÀ ALTA · scade tra 3 giorni" },
    { days: 1, label: "URGENTE · scade domani" },
  ];

  for (const threshold of thresholds) {
    const targetDate = romeDate(threshold.days);
    const rows = await db.select().from(promotions).where(and(
      eq(promotions.validUntil, targetDate),
      inArray(promotions.status, ["ONLINE", "ACTIVE", "EXPIRING"]),
    ));

    for (const promotion of rows) {
      if (await insertThresholdAlert(promotion, threshold.days, threshold.label)) alerts += 1;
    }
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

      const now = new Date().toISOString();
      await db.update(promotions).set({
        status: "EXPIRED",
        updatedAt: now,
      }).where(eq(promotions.id, promotion.id));

      await db.insert(auditLogs).values({
        id: crypto.randomUUID(),
        actorEmail: "system@eccomi.local",
        action: `PROMOTION_EXPIRED_AUTOMATICALLY:${promotion.validUntil}`,
        entityType: "promotion",
        entityId: promotion.id,
        payloadJson: JSON.stringify({
          validUntil: promotion.validUntil,
          shopifyUnpublished: Boolean(promotion.shopifyProductId),
        }),
      });

      await db.insert(hubEvents).values({
        id: crypto.randomUUID(),
        eventType: "NOLEGGIO_PROMOTION_EXPIRED",
        ecosystem: "ECCOMI_NOLEGGIO",
        entityType: "promotion",
        entityId: promotion.id,
        title: `${promotion.brand} ${promotion.model}: SCADUTA · DA DECIDERE`,
        payloadJson: JSON.stringify({ offerNumber: promotion.offerNumber, validUntil: promotion.validUntil }),
        actorEmail: "system@eccomi.local",
        createdAt: now,
      });

      expired += 1;
    } catch (error) {
      errors.push({ id: promotion.id, error: error instanceof Error ? error.message : "Errore inatteso" });
    }
  }

  return Response.json({
    ok: errors.length === 0,
    attention: attentionWindow.length,
    alerts,
    expired,
    errors,
  }, { status: errors.length ? 207 : 200 });
}
