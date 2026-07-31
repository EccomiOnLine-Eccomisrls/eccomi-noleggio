import { and, desc, eq, isNotNull } from "drizzle-orm";
import { getDb } from "../../../../db";
import {
  auditLogs,
  commissions,
  hubEvents,
  leads,
  partners,
  practiceDocuments,
  promotions,
} from "../../../../db/schema";
import { requireActor, routeError } from "../../../lib/server/authz";
import { ensurePracticeSchema } from "../../../lib/server/practice-schema";

async function requireCeoActor(request: Request) {
  const actor = await requireActor(request);

  if (actor.role !== "CEO") {
    throw new Response(
      JSON.stringify({ error: "Accesso riservato al CEO." }),
      {
        status: 403,
        headers: { "content-type": "application/json" },
      },
    );
  }

  return actor;
}

export async function GET(request: Request) {
  try {
    const actor = await requireCeoActor(request);
    await ensurePracticeSchema();

    const db = getDb();

    const rows = await db
      .select({
        id: leads.id,
        firstName: leads.firstName,
        lastName: leads.lastName,
        email: leads.email,
        phone: leads.phone,
        province: leads.province,
        status: leads.status,
        priority: leads.priority,
        assignedTo: leads.assignedTo,
        deletedAt: leads.deletedAt,
        deletedBy: leads.deletedBy,
        deleteReason: leads.deleteReason,
        createdAt: leads.createdAt,
        brand: promotions.brand,
        model: promotions.model,
        version: promotions.version,
        offerNumber: promotions.offerNumber,
        partnerName: partners.name,
      })
      .from(leads)
      .innerJoin(promotions, eq(leads.promotionId, promotions.id))
      .innerJoin(partners, eq(leads.partnerId, partners.id))
      .where(isNotNull(leads.deletedAt))
      .orderBy(desc(leads.deletedAt));

    return Response.json({
      actor,
      practices: rows.map((row) => ({
        ...row,
        customerName:
          `${row.firstName} ${row.lastName}`.trim(),
        vehicle:
          `${row.brand} ${row.model} ${row.version || ""}`.trim(),
      })),
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return routeError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireCeoActor(request);
    await ensurePracticeSchema();

    const body = await request.json() as {
      id?: unknown;
      action?: unknown;
      confirm?: unknown;
    };

    const id =
      typeof body.id === "string"
        ? body.id.trim()
        : "";

    const action =
      typeof body.action === "string"
        ? body.action.trim().toUpperCase()
        : "";

    if (!id) {
      return Response.json(
        { error: "Identificativo pratica mancante." },
        { status: 422 },
      );
    }

    if (!["RESTORE", "PURGE"].includes(action)) {
      return Response.json(
        { error: "Azione non valida." },
        { status: 422 },
      );
    }

    const db = getDb();

    const [practice] = await db
      .select()
      .from(leads)
      .where(
        and(
          eq(leads.id, id),
          isNotNull(leads.deletedAt),
        ),
      )
      .limit(1);

    if (!practice) {
      return Response.json(
        { error: "Pratica eliminata non trovata." },
        { status: 404 },
      );
    }

    const now = new Date().toISOString();

    if (action === "RESTORE") {
      await db
        .update(leads)
        .set({
          deletedAt: null,
          deletedBy: null,
          deleteReason: null,
          updatedAt: now,
        })
        .where(eq(leads.id, id));

      await db.insert(auditLogs).values({
        id: crypto.randomUUID(),
        actorEmail: actor.email,
        action: "PRACTICE_RESTORED",
        entityType: "lead",
        entityId: id,
        payloadJson: JSON.stringify({
          previousDeletedAt: practice.deletedAt,
          previousDeletedBy: practice.deletedBy,
          previousDeleteReason: practice.deleteReason,
          actorRole: actor.role,
        }),
      });

      await db.insert(hubEvents).values({
        id: crypto.randomUUID(),
        eventType: "NOLEGGIO_PRACTICE_RESTORED",
        ecosystem: "ECCOMI_NOLEGGIO",
        entityType: "lead",
        entityId: id,
        title: `${id} · pratica ripristinata`,
        payloadJson: JSON.stringify({
          previousDeletedAt: practice.deletedAt,
          previousDeleteReason: practice.deleteReason,
          actorRole: actor.role,
        }),
        actorEmail: actor.email,
      });

      return Response.json({
        ok: true,
        action: "RESTORE",
      });
    }

    if (body.confirm !== "ELIMINA") {
      return Response.json(
        {
          error:
            'Per eliminare definitivamente scrivi "ELIMINA".',
        },
        { status: 422 },
      );
    }

    /*
     * Conserviamo l'audit dell'eliminazione definitiva
     * prima di rimuovere la pratica.
     */
    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      actorEmail: actor.email,
      action: "PRACTICE_PURGED",
      entityType: "lead",
      entityId: id,
      payloadJson: JSON.stringify({
        deletedAt: practice.deletedAt,
        deletedBy: practice.deletedBy,
        deleteReason: practice.deleteReason,
        actorRole: actor.role,
      }),
    });

    await db.insert(hubEvents).values({
      id: crypto.randomUUID(),
      eventType: "NOLEGGIO_PRACTICE_PURGED",
      ecosystem: "ECCOMI_NOLEGGIO",
      entityType: "lead",
      entityId: id,
      title: `${id} · pratica eliminata definitivamente`,
      payloadJson: JSON.stringify({
        deletedAt: practice.deletedAt,
        deleteReason: practice.deleteReason,
        actorRole: actor.role,
      }),
      actorEmail: actor.email,
    });

    /*
     * Le tabelle collegate vengono rimosse esplicitamente
     * per evitare vincoli FK sul database.
     */
    await db
      .delete(commissions)
      .where(eq(commissions.leadId, id));

    await db
      .delete(practiceDocuments)
      .where(eq(practiceDocuments.leadId, id));

    await db
      .delete(leads)
      .where(eq(leads.id, id));

    return Response.json({
      ok: true,
      action: "PURGE",
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return routeError(error);
  }
}
