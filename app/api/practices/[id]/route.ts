import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { auditLogs, leads, partners, practiceDocuments, promotions } from "../../../../db/schema";
import { isPartnerNoleggioRole } from "../../../lib/permissions";
import { requireActor, routeError } from "../../../lib/server/authz";
import { decryptSensitivePracticeData } from "../../../lib/server/credential-crypto";
import { ensurePracticeSchema } from "../../../lib/server/practice-schema";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireActor(request);
    await ensurePracticeSchema();
    const { id } = await context.params;
    const db = getDb();

    const [practice] = await db
      .select({
        lead: leads,
        promotion: promotions,
        partner: partners,
      })
      .from(leads)
      .innerJoin(promotions, eq(leads.promotionId, promotions.id))
      .innerJoin(partners, eq(leads.partnerId, partners.id))
      .where(eq(leads.id, id))
      .limit(1);

    if (!practice) return Response.json({ error: "Pratica non trovata." }, { status: 404 });
    if (isPartnerNoleggioRole(actor.role) && actor.partnerId !== practice.lead.partnerId) {
      return Response.json({ error: "Pratica non autorizzata." }, { status: 403 });
    }

    const documents = await db
      .select({
        id: practiceDocuments.id,
        documentType: practiceDocuments.documentType,
        originalName: practiceDocuments.originalName,
        mimeType: practiceDocuments.mimeType,
        sizeBytes: practiceDocuments.sizeBytes,
        status: practiceDocuments.status,
        createdAt: practiceDocuments.createdAt,
      })
      .from(practiceDocuments)
      .where(eq(practiceDocuments.leadId, id))
      .orderBy(practiceDocuments.createdAt);

    const timeline = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.entityId, id))
      .orderBy(desc(auditLogs.createdAt))
      .limit(100);

    const iban = practice.lead.ibanEncrypted
      ? await decryptSensitivePracticeData(practice.lead.ibanEncrypted)
      : null;

    return Response.json({
      practice: {
        ...practice.lead,
        iban: actor.role === "CEO" ? iban : iban ? `${iban.slice(0, 4)} •••• •••• •••• ${iban.slice(-4)}` : null,
        promotion: {
          id: practice.promotion.id,
          offerNumber: practice.promotion.offerNumber,
          brand: practice.promotion.brand,
          model: practice.promotion.model,
          version: practice.promotion.version,
          provider: practice.promotion.provider,
          monthlyGrossCents: practice.promotion.monthlyGrossCents,
          depositGrossCents: practice.promotion.depositGrossCents,
          durationMonths: practice.promotion.durationMonths,
          totalKm: practice.promotion.totalKm,
        },
        partner: {
          id: practice.partner.id,
          name: practice.partner.name,
          legalName: practice.partner.legalName,
          contactName: practice.partner.contactName,
          contactEmail: practice.partner.contactEmail,
          additionalEmails: JSON.parse(practice.partner.additionalEmailsJson || "[]"),
        },
        documents,
        timeline,
      },
      actor,
    });
  } catch (error) {
    return routeError(error);
  }
}
