import { eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { auditLogs, leads, partners, promotions } from "../../../../../db/schema";
import { requireCeo, routeError } from "../../../../lib/server/authz";
import { ensurePracticeSchema } from "../../../../lib/server/practice-schema";
import { getRuntimeEnv } from "../../../../lib/server/runtime";

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireCeo(request);
    await ensurePracticeSchema();
    const { id } = await context.params;
    const body = await request.json() as {
      recipientEmail?: unknown;
      subject?: unknown;
      message?: unknown;
      saveRecipient?: unknown;
    };
    const db = getDb();
    const [practice] = await db
      .select({ lead: leads, partner: partners, promotion: promotions })
      .from(leads)
      .innerJoin(partners, eq(leads.partnerId, partners.id))
      .innerJoin(promotions, eq(leads.promotionId, promotions.id))
      .where(eq(leads.id, id))
      .limit(1);
    if (!practice) return Response.json({ error: "Pratica non trovata." }, { status: 404 });

    const recipientEmail = clean(body.recipientEmail, 160).toLowerCase() || practice.partner.contactEmail || "";
    if (!validEmail(recipientEmail)) return Response.json({ error: "Inserisci un indirizzo email valido del partner." }, { status: 422 });

    const runtime = getRuntimeEnv();
    const resendKey = runtime.RESEND_API_KEY?.trim();
    const from = runtime.ECCOMI_FROM_EMAIL?.trim();
    if (!resendKey || !from) {
      return Response.json({ error: "Invio email ECCOMI non ancora configurato sul server." }, { status: 503 });
    }

    const dashboardUrl = runtime.ECCOMI_PARTNER_DASHBOARD_URL?.trim() || new URL("/partner", request.url).toString();
    const subject = clean(body.subject, 180) || `Nuova pratica ECCOMI NOLEGGIO ${id}`;
    const customMessage = clean(body.message, 3000);
    const html = `
      <div style="font-family:Arial,sans-serif;color:#10253e;line-height:1.55">
        <h2 style="color:#075392">Nuova pratica ECCOMI NOLEGGIO</h2>
        <p>${customMessage || "È disponibile una nuova pratica completa assegnata alla vostra struttura."}</p>
        <table style="border-collapse:collapse;width:100%;max-width:620px">
          <tr><td style="padding:8px;border-bottom:1px solid #e4eaf0"><strong>Codice pratica</strong></td><td style="padding:8px;border-bottom:1px solid #e4eaf0">${id}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #e4eaf0"><strong>Cliente</strong></td><td style="padding:8px;border-bottom:1px solid #e4eaf0">${practice.lead.firstName} ${practice.lead.lastName}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #e4eaf0"><strong>Offerta</strong></td><td style="padding:8px;border-bottom:1px solid #e4eaf0">${practice.promotion.brand} ${practice.promotion.model} · ${practice.promotion.offerNumber}</td></tr>
        </table>
        <p style="margin-top:22px"><a href="${dashboardUrl}" style="display:inline-block;padding:12px 18px;border-radius:9px;background:#075392;color:#fff;text-decoration:none;font-weight:bold">Apri la dashboard partner</a></p>
        <p style="font-size:12px;color:#66768a">Per motivi di sicurezza i documenti non vengono allegati all'email: sono disponibili nell'area protetta ECCOMI.</p>
      </div>`;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${resendKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ from, to: [recipientEmail], subject, html }),
    });
    const payload = await response.json().catch(() => ({})) as { id?: string; message?: string };
    if (!response.ok) return Response.json({ error: payload.message || "Invio email al partner non riuscito." }, { status: 502 });

    const now = new Date().toISOString();
    await db.update(leads).set({ status: "SENT_TO_PARTNER", sentToPartnerAt: now, updatedAt: now }).where(eq(leads.id, id));
    if (body.saveRecipient === true && recipientEmail !== practice.partner.contactEmail) {
      const existing = JSON.parse(practice.partner.additionalEmailsJson || "[]") as string[];
      const updated = Array.from(new Set([...existing, recipientEmail]));
      await db.update(partners).set({ additionalEmailsJson: JSON.stringify(updated), updatedAt: now }).where(eq(partners.id, practice.partner.id));
    }
    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      actorEmail: actor.email,
      action: "PRACTICE_SENT_TO_PARTNER",
      entityType: "lead",
      entityId: id,
      payloadJson: JSON.stringify({ recipientEmail, resendId: payload.id || null, partnerId: practice.partner.id }),
    });
    return Response.json({ ok: true, status: "SENT_TO_PARTNER", recipientEmail, emailId: payload.id || null });
  } catch (error) {
    return routeError(error);
  }
}
