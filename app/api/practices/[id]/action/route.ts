import { eq } from "drizzle-orm";
import { getDb } from "../../../../../../db";
import { auditLogs, leads } from "../../../../../../db/schema";
import { requireActor, routeError } from "../../../../../lib/server/authz";
import { ensurePracticeSchema } from "../../../../../lib/server/practice-schema";

const allowedTransitions: Record<string, string[]> = {
  NEW: ["ECCOMI_REVIEW", "NEEDS_INFO", "SENT_TO_PARTNER", "ARCHIVED"],
  ECCOMI_REVIEW: ["NEEDS_INFO", "SENT_TO_PARTNER", "ARCHIVED"],
  NEEDS_INFO: ["ECCOMI_REVIEW", "SENT_TO_PARTNER", "ARCHIVED"],
  SENT_TO_PARTNER: ["QUOTE", "NEEDS_INFO", "ARCHIVED"],
  QUOTE: ["CONTRACT", "NEEDS_INFO", "ARCHIVED"],
  CONTRACT: ["DELIVERED", "ARCHIVED"],
  DELIVERED: ["ARCHIVED"],
};

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireActor(request);
    await ensurePracticeSchema();
    const { id } = await context.params;
    const body = await request.json() as { status?: unknown; note?: unknown };
    const nextStatus = typeof body.status === "string" ? body.status.trim().toUpperCase() : "";
    const note = typeof body.note === "string" ? body.note.trim().slice(0, 1000) : "";
    const db = getDb();
    const [practice] = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
    if (!practice) return Response.json({ error: "Pratica non trovata." }, { status: 404 });
    if (actor.role === "PARTNER" && actor.partnerId !== practice.partnerId) {
      return Response.json({ error: "Pratica non autorizzata." }, { status: 403 });
    }

    const possible = allowedTransitions[practice.status] || [];
    if (!possible.includes(nextStatus)) {
      return Response.json({ error: `Passaggio da ${practice.status} a ${nextStatus || "stato non valido"} non consentito.` }, { status: 422 });
    }
    if (actor.role === "PARTNER" && !["NEEDS_INFO", "QUOTE", "CONTRACT", "DELIVERED"].includes(nextStatus)) {
      return Response.json({ error: "Azione non consentita al partner." }, { status: 403 });
    }

    const now = new Date().toISOString();
    await db.update(leads).set({
      status: nextStatus,
      sentToPartnerAt: nextStatus === "SENT_TO_PARTNER" ? now : practice.sentToPartnerAt,
      updatedAt: now,
    }).where(eq(leads.id, id));
    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      actorEmail: actor.email,
      action: `PRACTICE_STATUS_${nextStatus}`,
      entityType: "lead",
      entityId: id,
      payloadJson: JSON.stringify({ from: practice.status, to: nextStatus, note, actorRole: actor.role }),
    });
    return Response.json({ ok: true, status: nextStatus });
  } catch (error) {
    return routeError(error);
  }
}
