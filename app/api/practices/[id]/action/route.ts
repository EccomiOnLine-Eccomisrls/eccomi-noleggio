import { eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { auditLogs, hubEvents, leads } from "../../../../../db/schema";
import { requireActor, routeError } from "../../../../lib/server/authz";
import { ensurePracticeSchema } from "../../../../lib/server/practice-schema";

const allowedTransitions: Record<string, string[]> = {
  NEW: ["ECCOMI_REVIEW", "NEEDS_INFO", "SENT_TO_PARTNER", "ARCHIVED"],
  ECCOMI_REVIEW: ["NEEDS_INFO", "SENT_TO_PARTNER", "ARCHIVED"],
  NEEDS_INFO: ["ECCOMI_REVIEW", "SENT_TO_PARTNER", "ARCHIVED"],
  SENT_TO_PARTNER: ["PARTNER_REVIEW", "NEEDS_INFO", "ARCHIVED"],
  PARTNER_REVIEW: ["QUOTE", "NEEDS_INFO", "ARCHIVED"],
  QUOTE: ["CONTRACT", "NEEDS_INFO", "ARCHIVED"],
  CONTRACT: ["DELIVERED", "ARCHIVED"],
  DELIVERED: ["ARCHIVED"],
  ARCHIVED: [],
};

const partnerAllowedStatuses = new Set([
  "PARTNER_REVIEW",
  "NEEDS_INFO",
  "QUOTE",
  "CONTRACT",
  "DELIVERED",
]);

const statusLabels: Record<string, string> = {
  NEW: "Richiesta ricevuta",
  ECCOMI_REVIEW: "Presa in carico da ECCOMI",
  NEEDS_INFO: "Integrazione richiesta",
  SENT_TO_PARTNER: "Inviata al partner",
  PARTNER_REVIEW: "Presa in carico dal partner",
  QUOTE: "Preventivo predisposto",
  CONTRACT: "Contratto acquisito",
  DELIVERED: "Veicolo consegnato",
  ARCHIVED: "Pratica archiviata",
};

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireActor(request);
    await ensurePracticeSchema();

    const { id } = await context.params;
    const body = await request.json() as {
      status?: unknown;
      note?: unknown;
      priority?: unknown;
      assignedTo?: unknown;
    };

    const nextStatus =
      typeof body.status === "string"
        ? body.status.trim().toUpperCase()
        : "";

    const note =
      typeof body.note === "string"
        ? body.note.trim().slice(0, 2000)
        : "";

    const requestedPriority =
      typeof body.priority === "string"
        ? body.priority.trim().toUpperCase()
        : "";

    const hasAssignmentRequest =
      Object.prototype.hasOwnProperty.call(body, "assignedTo");

    const requestedAssignedTo =
      typeof body.assignedTo === "string"
        ? body.assignedTo.trim().slice(0, 160)
        : "";

    const db = getDb();

    const [practice] = await db
      .select()
      .from(leads)
      .where(eq(leads.id, id))
      .limit(1);

    if (!practice) {
      return Response.json(
        { error: "Pratica non trovata." },
        { status: 404 },
      );
    }

    if (
      actor.role === "PARTNER"
      && actor.partnerId !== practice.partnerId
    ) {
      return Response.json(
        { error: "Pratica non autorizzata." },
        { status: 403 },
      );
    }

    /*
     * ASSEGNAZIONE RESPONSABILE
     */
    if (hasAssignmentRequest) {
      if (actor.role !== "CEO") {
        return Response.json(
          { error: "Solo il CEO può assegnare una pratica." },
          { status: 403 },
        );
      }

      const previousAssignedTo =
        practice.assignedTo || null;

      const nextAssignedTo =
        requestedAssignedTo || null;

      const now = new Date().toISOString();

      await db
        .update(leads)
        .set({
          assignedTo: nextAssignedTo,
          assignedAt: nextAssignedTo ? now : null,
          updatedAt: now,
        })
        .where(eq(leads.id, id));

      await db.insert(auditLogs).values({
        id: crypto.randomUUID(),
        actorEmail: actor.email,
        action: nextAssignedTo
          ? "PRACTICE_ASSIGNED"
          : "PRACTICE_UNASSIGNED",
        entityType: "lead",
        entityId: id,
        payloadJson: JSON.stringify({
          from: previousAssignedTo,
          to: nextAssignedTo,
          actorRole: actor.role,
        }),
      });

      await db.insert(hubEvents).values({
        id: crypto.randomUUID(),
        eventType: nextAssignedTo
          ? "NOLEGGIO_PRACTICE_ASSIGNED"
          : "NOLEGGIO_PRACTICE_UNASSIGNED",
        ecosystem: "ECCOMI_NOLEGGIO",
        entityType: "lead",
        entityId: id,
        title: nextAssignedTo
          ? `${id} · assegnata a ${nextAssignedTo}`
          : `${id} · assegnazione rimossa`,
        payloadJson: JSON.stringify({
          from: previousAssignedTo,
          to: nextAssignedTo,
          actorRole: actor.role,
        }),
        actorEmail: actor.email,
      });

      return Response.json({
        ok: true,
        assignedTo: nextAssignedTo,
        assignedAt: nextAssignedTo ? now : null,
      });
    }

    /*
     * MODIFICA PRIORITÀ
     */
    if (requestedPriority) {
      if (actor.role !== "CEO") {
        return Response.json(
          { error: "Solo il CEO può modificare la priorità." },
          { status: 403 },
        );
      }

      const allowedPriorities = new Set([
        "LOW",
        "NORMAL",
        "HIGH",
      ]);

      if (!allowedPriorities.has(requestedPriority)) {
        return Response.json(
          { error: "Priorità non valida." },
          { status: 422 },
        );
      }

      const now = new Date().toISOString();

      await db
        .update(leads)
        .set({
          priority: requestedPriority,
          updatedAt: now,
        })
        .where(eq(leads.id, id));

      await db.insert(auditLogs).values({
        id: crypto.randomUUID(),
        actorEmail: actor.email,
        action: "PRACTICE_PRIORITY_CHANGED",
        entityType: "lead",
        entityId: id,
        payloadJson: JSON.stringify({
          from: practice.priority || "NORMAL",
          to: requestedPriority,
          actorRole: actor.role,
        }),
      });

      await db.insert(hubEvents).values({
        id: crypto.randomUUID(),
        eventType: "NOLEGGIO_PRACTICE_PRIORITY_CHANGED",
        ecosystem: "ECCOMI_NOLEGGIO",
        entityType: "lead",
        entityId: id,
        title: `Priorità aggiornata · ${id}`,
        payloadJson: JSON.stringify({
          from: practice.priority || "NORMAL",
          to: requestedPriority,
          actorRole: actor.role,
        }),
        actorEmail: actor.email,
      });

      return Response.json({
        ok: true,
        priority: requestedPriority,
      });
    }

    /*
     * NOTA SENZA CAMBIO DI STATO
     */
    if (!nextStatus) {
      if (!note) {
        return Response.json(
          { error: "Inserisci una nota operativa." },
          { status: 422 },
        );
      }

      await db.insert(auditLogs).values({
        id: crypto.randomUUID(),
        actorEmail: actor.email,
        action: "PRACTICE_NOTE",
        entityType: "lead",
        entityId: id,
        payloadJson: JSON.stringify({
          note,
          status: practice.status,
          actorRole: actor.role,
        }),
      });

      await db.insert(hubEvents).values({
        id: crypto.randomUUID(),
        eventType: "NOLEGGIO_PRACTICE_NOTE",
        ecosystem: "ECCOMI_NOLEGGIO",
        entityType: "lead",
        entityId: id,
        title: `Nota aggiunta alla pratica ${id}`,
        payloadJson: JSON.stringify({
          status: practice.status,
          actorRole: actor.role,
        }),
        actorEmail: actor.email,
      });

      return Response.json({
        ok: true,
        status: practice.status,
        noteAdded: true,
      });
    }

    const possible = allowedTransitions[practice.status] || [];

    if (!possible.includes(nextStatus)) {
      return Response.json(
        {
          error:
            `Passaggio da ${practice.status} a `
            + `${nextStatus || "stato non valido"} non consentito.`,
        },
        { status: 422 },
      );
    }

    if (
      actor.role === "PARTNER"
      && !partnerAllowedStatuses.has(nextStatus)
    ) {
      return Response.json(
        { error: "Azione non consentita al partner." },
        { status: 403 },
      );
    }

    if (nextStatus === "NEEDS_INFO" && note.length < 5) {
      return Response.json(
        {
          error:
            "Descrivi nella nota quali informazioni o documenti mancano.",
        },
        { status: 422 },
      );
    }

    const now = new Date().toISOString();

    await db
      .update(leads)
      .set({
        status: nextStatus,
        sentToPartnerAt:
          nextStatus === "SENT_TO_PARTNER"
            ? now
            : practice.sentToPartnerAt,
        updatedAt: now,
      })
      .where(eq(leads.id, id));

    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      actorEmail: actor.email,
      action: `PRACTICE_STATUS_${nextStatus}`,
      entityType: "lead",
      entityId: id,
      payloadJson: JSON.stringify({
        from: practice.status,
        to: nextStatus,
        note,
        actorRole: actor.role,
      }),
    });

    await db.insert(hubEvents).values({
      id: crypto.randomUUID(),
      eventType: `NOLEGGIO_PRACTICE_${nextStatus}`,
      ecosystem: "ECCOMI_NOLEGGIO",
      entityType: "lead",
      entityId: id,
      title:
        `${id} · ${statusLabels[nextStatus] || nextStatus}`,
      payloadJson: JSON.stringify({
        from: practice.status,
        to: nextStatus,
        note: note || null,
        actorRole: actor.role,
      }),
      actorEmail: actor.email,
    });

    return Response.json({
      ok: true,
      status: nextStatus,
      label: statusLabels[nextStatus] || nextStatus,
    });
  } catch (error) {
    return routeError(error);
  }
}
