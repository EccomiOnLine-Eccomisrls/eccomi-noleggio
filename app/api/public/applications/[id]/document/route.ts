import { eq } from "drizzle-orm";
import { getDb } from "../../../../../../db";
import { leads, practiceDocuments } from "../../../../../../db/schema";
import { ensurePracticeSchema } from "../../../../../lib/server/practice-schema";
import { uploadPracticeDocument } from "../../../../../lib/server/practice-storage";
import { corsHeaders, jsonWithCors, publicCorsOrigin } from "../../../../../lib/server/public-origin";

const ALLOWED_MIME_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["IDENTITY", "TAX_CODE", "INCOME", "VAT_CERTIFICATE", "LEGAL_REP_IDENTITY", "CHAMBER_REPORT", "FINANCIAL"]);

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
  const [practice] = await db.select({ id: leads.id, status: leads.status }).from(leads).where(eq(leads.id, id)).limit(1);
  if (!practice) return jsonWithCors({ error: "Pratica non trovata." }, 404, origin);
  if (!["UPLOAD_IN_PROGRESS", "UPLOAD_ERROR"].includes(practice.status)) {
    return jsonWithCors({ error: "La pratica non accetta nuovi documenti." }, 409, origin);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonWithCors({ error: "Documento non valido." }, 400, origin);
  }
  const documentType = typeof form.get("documentType") === "string" ? String(form.get("documentType")).trim().toUpperCase() : "";
  const file = form.get("file");
  if (!ALLOWED_TYPES.has(documentType)) return jsonWithCors({ error: "Tipo documento non valido." }, 422, origin);
  if (!(file instanceof File) || file.size <= 0) return jsonWithCors({ error: "Seleziona un file valido." }, 422, origin);
  if (file.size > MAX_FILE_BYTES) return jsonWithCors({ error: "Il file supera 10 MB." }, 413, origin);
  if (!ALLOWED_MIME_TYPES.has(file.type)) return jsonWithCors({ error: "Usa un file PDF, JPG o PNG." }, 422, origin);

  try {
    const stored = await uploadPracticeDocument({ practiceCode: id, documentType, file });
    const now = new Date().toISOString();
    const documentId = crypto.randomUUID();
    await db.insert(practiceDocuments).values({
      id: documentId,
      leadId: id,
      documentType,
      originalName: stored.originalName,
      mimeType: stored.mimeType,
      sizeBytes: stored.sizeBytes,
      storageBucket: stored.bucket,
      storageKey: stored.objectKey,
      status: "UPLOADED",
      uploadedBy: "CUSTOMER",
      createdAt: now,
      updatedAt: now,
    });
    return jsonWithCors({ ok: true, documentId, originalName: stored.originalName }, 201, origin);
  } catch (error) {
    await db.update(leads).set({ status: "UPLOAD_ERROR", documentStatus: "ERROR", updatedAt: new Date().toISOString() }).where(eq(leads.id, id));
    return jsonWithCors({ error: error instanceof Error ? error.message : "Caricamento documento non riuscito." }, 500, origin);
  }
}
