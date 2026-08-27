import { eq } from "drizzle-orm";
import { getDb } from "../../../../../../db";
import { auditLogs, hubEvents, promotions } from "../../../../../../db/schema";
import { isPartnerNoleggioRole } from "../../../../../lib/permissions";
import { requireActor, routeError } from "../../../../../lib/server/authz";
import {
  getEffectivePromotionEccomiCommission,
  setPartnerPromotionCommissionIncrement,
} from "../../../../../lib/server/commission-service";
import { isRenderPullRequestPreview } from "../../../../../lib/server/preview-mode";
import { publicUrl } from "../../../../../lib/server/public-url";

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || new URL(origin).host === new URL(request.url).host;
}

function euroToCents(value: FormDataEntryValue | null) {
  const raw = typeof value === "string" ? value.trim().replace(",", ".") : "";
  if (!raw) return Number.NaN;
  const amount = Number(raw);
  return Number.isFinite(amount) ? Math.round(amount * 100) : Number.NaN;
}

function redirectBack(request: Request, result: "saved" | "error", message: string) {
  const target = publicUrl(request, "/partner/provvigioni");
  target.searchParams.set("partnerIncrease", result);
  target.searchParams.set("message", message.slice(0, 220));
  return Response.redirect(target, 303);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    if (!sameOrigin(request)) {
      return Response.json({ error: "Richiesta non autorizzata." }, { status: 403 });
    }
    if (isRenderPullRequestPreview(request)) {
      return Response.json({ error: "Preview sicura: nessuna provvigione reale può essere modificata." }, { status: 409 });
    }

    const actor = await requireActor(request);
    if (!isPartnerNoleggioRole(actor.role) || !actor.partnerId) {
      return Response.json({ error: "Azione riservata al Partner." }, { status: 403 });
    }
    if (actor.role !== "PARTNER_ADMIN") {
      return redirectBack(request, "error", "Solo il Partner Admin può aumentare la provvigione ECCOMI.");
    }

    const { id } = await context.params;
    const form = await request.formData();
    const requestedTotalCents = euroToCents(form.get("total"));
    if (!Number.isInteger(requestedTotalCents) || requestedTotalCents < 0 || requestedTotalCents > 10_000_000) {
      return redirectBack(request, "error", "Importo imponibile non valido.");
    }

    const [promotion] = await getDb()
      .select({
        id: promotions.id,
        partnerId: promotions.partnerId,
        offerNumber: promotions.offerNumber,
        brand: promotions.brand,
        model: promotions.model,
        status: promotions.status,
      })
      .from(promotions)
      .where(eq(promotions.id, id))
      .limit(1);

    if (!promotion) return redirectBack(request, "error", "Offerta non trovata.");
    if (promotion.partnerId !== actor.partnerId) {
      return Response.json({ error: "Questa offerta non appartiene alla tua società." }, { status: 403 });
    }
    if (["TRASHED", "ARCHIVED"].includes(promotion.status)) {
      return redirectBack(request, "error", "L'offerta è archiviata e non può essere modificata.");
    }

    const current = await getEffectivePromotionEccomiCommission(id);
    if (!current) {
      return redirectBack(request, "error", "ECCOMI deve prima definire la provvigione base imponibile dell'offerta.");
    }
    if (requestedTotalCents <= current.totalCents) {
      return redirectBack(
        request,
        "error",
        `Puoi solo aumentare la provvigione. Il totale imponibile attuale è ${(current.totalCents / 100).toFixed(2).replace(".", ",")} € + IVA.`
      );
    }

    const newIncrementCents = requestedTotalCents - current.baseCents;
    await setPartnerPromotionCommissionIncrement(id, newIncrementCents, actor.email);

    const now = new Date().toISOString();
    await getDb().insert(auditLogs).values({
      id: crypto.randomUUID(),
      actorEmail: actor.email,
      action: "PARTNER_ECCOMI_COMMISSION_INCREASE",
      entityType: "promotion",
      entityId: id,
      payloadJson: JSON.stringify({
        offerNumber: promotion.offerNumber,
        partnerId: promotion.partnerId,
        baseCents: current.baseCents,
        previousIncrementCents: current.partnerIncrementCents,
        previousTotalCents: current.totalCents,
        incrementCents: newIncrementCents,
        totalCents: requestedTotalCents,
        vatExcluded: true,
        actorRole: actor.role,
      }),
      createdAt: now,
    });
    await getDb().insert(hubEvents).values({
      id: crypto.randomUUID(),
      eventType: "NOLEGGIO_PARTNER_COMMISSION_INCREASED",
      ecosystem: "ECCOMI_NOLEGGIO",
      entityType: "promotion",
      entityId: id,
      title: `${promotion.brand} ${promotion.model} · provvigione ECCOMI aumentata dal Partner`,
      payloadJson: JSON.stringify({
        offerNumber: promotion.offerNumber,
        partnerId: promotion.partnerId,
        fromCents: current.totalCents,
        toCents: requestedTotalCents,
        partnerIncrementCents: newIncrementCents,
        vatExcluded: true,
      }),
      actorEmail: actor.email,
      createdAt: now,
    });

    return redirectBack(
      request,
      "saved",
      `Provvigione imponibile aumentata a ${(requestedTotalCents / 100).toFixed(2).replace(".", ",")} € + IVA. Le pratiche già nate non cambiano.`
    );
  } catch (error) {
    return routeError(error);
  }
}
