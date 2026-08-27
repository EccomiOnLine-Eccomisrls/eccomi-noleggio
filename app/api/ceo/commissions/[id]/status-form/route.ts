import { eq } from "drizzle-orm";
import { getDb } from "../../../../../../db";
import { auditLogs, commissions, hubEvents } from "../../../../../../db/schema";
import { requireCeo, routeError } from "../../../../../lib/server/authz";
import { isRenderPullRequestPreview } from "../../../../../lib/server/preview-mode";
import { publicUrl } from "../../../../../lib/server/public-url";

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || new URL(origin).host === new URL(request.url).host;
}

function safeReturnTo(value: FormDataEntryValue | null) {
  const target = typeof value === "string" ? value.trim().slice(0, 500) : "";
  return target.startsWith("/ceo/") ? target : "/ceo/partners";
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
      return Response.json({ error: "Preview sicura: nessuna commissione reale può essere modificata." }, { status: 409 });
    }

    const actor = await requireCeo(request);
    const { id } = await context.params;
    const form = await request.formData();
    const targetStatus = String(form.get("status") || "").trim().toUpperCase();
    const returnTo = safeReturnTo(form.get("returnTo"));
    const db = getDb();
    const [commission] = await db.select().from(commissions).where(eq(commissions.id, id)).limit(1);

    if (!commission) return Response.json({ error: "Commissione non trovata." }, { status: 404 });

    const allowed = commission.status === "ACCRUED"
      ? targetStatus === "INVOICED"
      : commission.status === "INVOICED"
        ? targetStatus === "PAID"
        : false;
    if (!allowed) {
      return Response.json({ error: `Passaggio commissione da ${commission.status} a ${targetStatus || "stato non valido"} non consentito.` }, { status: 422 });
    }

    const now = new Date().toISOString();
    await db.transaction(async (tx) => {
      await tx.update(commissions).set({
        status: targetStatus,
        invoicedAt: targetStatus === "INVOICED" ? now : commission.invoicedAt,
        paidAt: targetStatus === "PAID" ? now : commission.paidAt,
        updatedAt: now,
      }).where(eq(commissions.id, id));

      await tx.insert(auditLogs).values({
        id: crypto.randomUUID(),
        actorEmail: actor.email,
        action: `COMMISSION_STATUS_${targetStatus}`,
        entityType: "commission",
        entityId: id,
        payloadJson: JSON.stringify({
          from: commission.status,
          to: targetStatus,
          leadId: commission.leadId,
          partnerId: commission.partnerId,
          amountCents: commission.amountCents,
        }),
        createdAt: now,
      });
      await tx.insert(hubEvents).values({
        id: crypto.randomUUID(),
        eventType: `NOLEGGIO_COMMISSION_${targetStatus}`,
        ecosystem: "ECCOMI_NOLEGGIO",
        entityType: "commission",
        entityId: id,
        title: `${commission.leadId} · commissione ${targetStatus === "INVOICED" ? "fatturata" : "pagata"}`,
        payloadJson: JSON.stringify({ leadId: commission.leadId, partnerId: commission.partnerId, amountCents: commission.amountCents }),
        actorEmail: actor.email,
        createdAt: now,
      });
    });

    const target = publicUrl(request, returnTo);
    target.searchParams.set("commissionStatus", targetStatus.toLowerCase());
    return Response.redirect(target, 303);
  } catch (error) {
    return routeError(error);
  }
}
