import { eq } from "drizzle-orm";
import { getDb } from "../../../../../../db";
import { auditLogs, leads, practiceDocuments } from "../../../../../../db/schema";
import { ensurePracticeSchema } from "../../../../../lib/server/practice-schema";
import { corsHeaders, jsonWithCors, publicCorsOrigin } from "../../../../../lib/server/public-origin";

const requiredTypes: Record<string, string[]> = {
  PRIVATE: ["IDENTITY", "TAX_CODE", "INCOME"],
  PROFESSIONAL: ["IDENTITY", "VAT_CERTIFICATE", "INCOME"],
  COMPANY: ["LEGAL_REP_IDENTITY", "CHAMBER_REPORT", "FINANCIAL"],
};

export async function OPTIONS(request: Request) {
  const origin = await publicCorsOrigin(request);
  if (!origin) return jsonWithCors({ error: "Origine non autorizzata." }, 403, null);
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const origin = await publicCorsOrigin(request);
  if (!origin) return jsonWithCors({ error: "Origine non autorizzata." }, 403, null);

  const { id } = await context.params;
  await ensurePracticeSchema();
  const db = getDb();
  const [practice] = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
  if (!practice) return jsonWithCors({ error: "Pratica non trovata." }, 404, origin);
  if (practice.status === "NEW") return jsonWithCors({ ok: true, practiceCode: id, status: "NEW", duplicate: true }, 200, origin);

  const documents = await db.select({ documentType: practiceDocuments.documentType }).from(practiceDocuments).where(eq(practiceDocuments.leadId, id));
  const uploadedTypes = new Set(documents.map((item) => item.documentType));
  const missing = (requiredTypes[practice.customerType] || []).filter((type) => !uploadedTypes.has(type));
  if (missing.length) return jsonWithCors({ error: "Mancano uno o più documenti obbligatori." }, 422, origin);

  const now = new Date().toISOString();
  await db.update(leads).set({ status: "NEW", documentStatus: "COMPLETE", completedAt: now, updatedAt: now }).where(eq(leads.id, id));
  await db.insert(auditLogs).values({
    id: crypto.randomUUID(),
    actorEmail: "public-form@eccomi.local",
    action: "PRACTICE_CREATED_WITH_DOCUMENTS",
    entityType: "lead",
    entityId: id,
    payloadJson: JSON.stringify({ documentCount: documents.length, source: "ECCOMI_NOLEGGIO_WEB" }),
  });
  return jsonWithCors({ ok: true, practiceCode: id, status: "NEW" }, 200, origin);
}
