import { eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { auditLogs, hubEvents, promotions } from "../../../../../db/schema";
import { requirePermission, routeError } from "../../../../lib/server/authz";
import {
  getPromotionEccomiCommission,
  setPromotionEccomiCommission,
} from "../../../../lib/server/commission-service";
import { isRenderPullRequestPreview } from "../../../../lib/server/preview-mode";
import { publicUrl } from "../../../../lib/server/public-url";

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || new URL(origin).host === new URL(request.url).host;
}

function text(value: FormDataEntryValue | null, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function euroToCents(value: FormDataEntryValue | null) {
  const raw = text(value, 30).replace(",", ".");
  const amount = Number(raw);
  if (!raw || !Number.isFinite(amount) || amount < 0) return Number.NaN;
  return Math.round(amount * 100);
}

function safeReturnTo(value: FormDataEntryValue | null) {
  const target = text(value, 500);
  return target.startsWith("/ceo/") ? target : "/ceo/commissions";
}

export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) {
      return Response.json({ error: "Richiesta non autorizzata." }, { status: 403 });
    }
    if (isRenderPullRequestPreview(request)) {
      return Response.json({ error: "Preview sicura: nessuna provvigione reale può essere modificata." }, { status: 409 });
    }

    const actor = await requirePermission(request, "COMMISSION_SET_ECCOMI");
    const form = await request.formData();
    const promotionId = text(form.get("promotionId"), 200);
    const returnTo = safeReturnTo(form.get("returnTo"));
    const amountCents = euroToCents(form.get("amount"));

    if (!promotionId || Number.isNaN(amountCents) || amountCents > 10_000_000) {
      return Response.json({ error: "Provvigione ECCOMI imponibile non valida." }, { status: 422 });
    }

    const [promotion] = await getDb()
      .select({ id: promotions.id, offerNumber: promotions.offerNumber, brand: promotions.brand, model: promotions.model, status: promotions.status })
      .from(promotions)
      .where(eq(promotions.id, promotionId))
      .limit(1);
    if (!promotion) return Response.json({ error: "Offerta non trovata." }, { status: 404 });
    if (["TRASHED", "ARCHIVED"].includes(promotion.status)) {
      return Response.json({ error: "La provvigione non può essere modificata su un'offerta archiviata." }, { status: 409 });
    }

    const previousAmountCents = await getPromotionEccomiCommission(promotionId);
    const savedAmountCents = await setPromotionEccomiCommission(promotionId, amountCents, actor.email);
    const now = new Date().toISOString();

    await getDb().insert(auditLogs).values({
      id: crypto.randomUUID(),
      actorEmail: actor.email,
      action: "ECCOMI_COMMISSION_OFFER_SET",
      entityType: "promotion",
      entityId: promotionId,
      payloadJson: JSON.stringify({
        offerNumber: promotion.offerNumber,
        previousAmountCents,
        amountCents: savedAmountCents,
        vatExcluded: true,
        actorRole: actor.role,
      }),
      createdAt: now,
    });
    await getDb().insert(hubEvents).values({
      id: crypto.randomUUID(),
      eventType: "NOLEGGIO_ECCOMI_COMMISSION_OFFER_SET",
      ecosystem: "ECCOMI_NOLEGGIO",
      entityType: "promotion",
      entityId: promotionId,
      title: `${promotion.brand} ${promotion.model} · provvigione ECCOMI imponibile definita`,
      payloadJson: JSON.stringify({ offerNumber: promotion.offerNumber, previousAmountCents, amountCents: savedAmountCents, vatExcluded: true, actorRole: actor.role }),
      actorEmail: actor.email,
      createdAt: now,
    });

    const target = publicUrl(request, returnTo);
    target.searchParams.set("commissionRule", "saved");
    return Response.redirect(target, 303);
  } catch (error) {
    return routeError(error);
  }
}
