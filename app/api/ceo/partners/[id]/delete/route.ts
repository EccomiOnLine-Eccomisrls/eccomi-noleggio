import { eq } from "drizzle-orm";
import { getDb } from "../../../../../../db";
import { auditLogs, hubEvents, partners } from "../../../../../../db/schema";
import { requireCeo, routeError } from "../../../../../lib/server/authz";
import { getPartnerDeleteState } from "../../../../../lib/server/partner-delete-policy";
import { isRenderPullRequestPreview } from "../../../../../lib/server/preview-mode";

type DeletePayload = { confirm?: string };

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({})) as DeletePayload;
    const confirmation = typeof body.confirm === "string" ? body.confirm.trim().toUpperCase() : "";
    if (confirmation !== "ELIMINA") {
      return Response.json({ error: "Scrivi ELIMINA per confermare la cancellazione." }, { status: 400 });
    }

    const preview = isRenderPullRequestPreview(request);
    if (preview) {
      const state = await getPartnerDeleteState(id, true);
      if (!state) return Response.json({ error: "Partner preview non trovato." }, { status: 404 });
      if (!state.canDelete) {
        return Response.json({
          error: state.internalEccomi
            ? "ECCOMI DIRETTO è una struttura interna protetta e non può essere eliminata."
            : "Il Partner ha ancora collegamenti e non può essere eliminato.",
          blockers: state.blockers,
          internalEccomi: state.internalEccomi,
        }, { status: 409 });
      }
      return Response.json({
        ok: true,
        preview: true,
        simulated: true,
        deletedPartner: state.partner.name,
        blockers: state.blockers,
        message: "SIMULAZIONE PREVIEW: nessuna scrittura su Supabase.",
      });
    }

    const actor = await requireCeo(request);
    const state = await getPartnerDeleteState(id, false);
    if (!state) return Response.json({ error: "Partner non trovato." }, { status: 404 });
    if (state.internalEccomi) {
      return Response.json({
        error: "ECCOMI DIRETTO è una struttura interna protetta e non può essere eliminata.",
        blockers: state.blockers,
        internalEccomi: true,
      }, { status: 409 });
    }
    if (!state.canDelete) {
      return Response.json({
        error: "Il Partner ha ancora collegamenti. Sposta o rimuovi prima offerte, pratiche, utenti e commissioni indicate.",
        blockers: state.blockers,
        internalEccomi: false,
      }, { status: 409 });
    }

    const db = getDb();
    const now = new Date().toISOString();
    await db.transaction(async (tx) => {
      await tx.insert(auditLogs).values({
        id: crypto.randomUUID(),
        actorEmail: actor.email,
        action: "PARTNER_DELETED",
        entityType: "partner",
        entityId: state.partner.id,
        payloadJson: JSON.stringify({
          name: state.partner.name,
          legalName: state.partner.legalName,
          blockersAtDelete: state.blockers,
        }),
        createdAt: now,
      });

      await tx.insert(hubEvents).values({
        id: crypto.randomUUID(),
        eventType: "NOLEGGIO_PARTNER_DELETED",
        ecosystem: "ECCOMI_NOLEGGIO",
        entityType: "partner",
        entityId: state.partner.id,
        title: `Partner eliminato: ${state.partner.name}`,
        payloadJson: JSON.stringify({
          name: state.partner.name,
          legalName: state.partner.legalName,
          protectedDelete: true,
        }),
        actorEmail: actor.email,
        createdAt: now,
      });

      await tx.delete(partners).where(eq(partners.id, state.partner.id));
    });

    return Response.json({
      ok: true,
      preview: false,
      deletedPartner: state.partner.name,
      blockers: state.blockers,
    });
  } catch (error) {
    return routeError(error);
  }
}
