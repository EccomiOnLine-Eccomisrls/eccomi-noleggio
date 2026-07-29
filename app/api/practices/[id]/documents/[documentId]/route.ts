import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../../../../db";
import { leads, practiceDocuments } from "../../../../../../../db/schema";
import { requireActor, routeError } from "../../../../../../lib/server/authz";
import { ensurePracticeSchema } from "../../../../../../lib/server/practice-schema";
import { createPracticeDocumentSignedUrl } from "../../../../../../lib/server/practice-storage";

export async function GET(request: Request, context: { params: Promise<{ id: string; documentId: string }> }) {
  try {
    const actor = await requireActor(request);
    await ensurePracticeSchema();
    const { id, documentId } = await context.params;
    const db = getDb();
    const [document] = await db
      .select({
        id: practiceDocuments.id,
        leadId: practiceDocuments.leadId,
        storageKey: practiceDocuments.storageKey,
        originalName: practiceDocuments.originalName,
        partnerId: leads.partnerId,
      })
      .from(practiceDocuments)
      .innerJoin(leads, eq(practiceDocuments.leadId, leads.id))
      .where(and(eq(practiceDocuments.id, documentId), eq(practiceDocuments.leadId, id)))
      .limit(1);

    if (!document) return Response.json({ error: "Documento non trovato." }, { status: 404 });
    if (actor.role === "PARTNER" && actor.partnerId !== document.partnerId) {
      return Response.json({ error: "Documento non autorizzato." }, { status: 403 });
    }

    const url = await createPracticeDocumentSignedUrl(document.storageKey, 900);
    return Response.redirect(url, 302);
  } catch (error) {
    return routeError(error);
  }
}
