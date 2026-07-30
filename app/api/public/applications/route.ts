import { and, eq, gte } from "drizzle-orm";
import { getDb } from "../../../../db";
import { auditLogs, leads, partners, practiceDocuments, promotions } from "../../../../db/schema";
import { encryptSensitivePracticeData } from "../../../lib/server/credential-crypto";
import { ensurePracticeSchema } from "../../../lib/server/practice-schema";
import { uploadPracticeDocument } from "../../../lib/server/practice-storage";
import { corsHeaders, jsonWithCors, publicCorsOrigin } from "../../../lib/server/public-origin";

const PRIVACY_VERSION = "ECCOMI-NOLEGGIO-2026-07";
const customerTypes = new Set(["PRIVATE", "PROFESSIONAL", "COMPANY"]);
const MAX_TOTAL_BYTES = 40 * 1024 * 1024;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_FILES_PER_REQUIREMENT = 10;
const ALLOWED_MIME_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);

const requiredDocuments: Record<string, Array<{ field: string; type: string; label: string }>> = {
  PRIVATE: [
    { field: "document_identity", type: "IDENTITY", label: "Documento di identità" },
    { field: "document_tax_code", type: "TAX_CODE", label: "Tessera sanitaria / codice fiscale" },
    { field: "document_income", type: "INCOME", label: "Documentazione reddituale" },
  ],
  PROFESSIONAL: [
    { field: "document_identity", type: "IDENTITY", label: "Documento di identità" },
    { field: "document_vat", type: "VAT_CERTIFICATE", label: "Attribuzione Partita IVA" },
    { field: "document_income", type: "INCOME", label: "Ultima dichiarazione dei redditi" },
  ],
  COMPANY: [
    { field: "document_identity", type: "LEGAL_REP_IDENTITY", label: "Documento del legale rappresentante" },
    { field: "document_chamber", type: "CHAMBER_REPORT", label: "Visura camerale aggiornata" },
    { field: "document_financial", type: "FINANCIAL", label: "Documentazione economica" },
  ],
};

function cleanText(value: FormDataEntryValue | null | unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, maxLength) : "";
}

function practiceCode() {
  const day = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" }).replaceAll("-", "");
  const random = crypto.randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase();
  return `ECN-${day}-${random}`;
}

function invalid(message: string, origin: string | null) {
  return jsonWithCors({ error: message }, 422, origin);
}

function normalizeIban(value: string) {
  return value.toUpperCase().replace(/\s+/g, "");
}

function validIban(value: string) {
  const iban = normalizeIban(value);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  const rearranged = `${iban.slice(4)}${iban.slice(0, 4)}`;
  let remainder = 0;
  for (const character of rearranged) {
    const numeric = /\d/.test(character) ? character : String(character.charCodeAt(0) - 55);
    for (const digit of numeric) remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1;
}

function requiredBoolean(value: FormDataEntryValue | null) {
  return value === "true" || value === "1" || value === "on";
}

export async function GET(request: Request) {
  const origin = await publicCorsOrigin(request);
  return jsonWithCors({ ok: true, route: "public-applications", methods: ["POST", "OPTIONS"] }, 200, origin);
}

export async function OPTIONS(request: Request) {
  const origin = await publicCorsOrigin(request);
  if (!origin) return jsonWithCors({ error: "Origine non autorizzata." }, 403, null);
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const origin = await publicCorsOrigin(request);
  const contentLength = Number(request.headers.get("content-length") || 0);
  console.info("[PRACTICE_MONOLITHIC] request_received", { origin: origin || "DENIED", contentLength });

  if (!origin) return jsonWithCors({ error: "Origine non autorizzata." }, 403, null);
  if (contentLength > MAX_TOTAL_BYTES) return jsonWithCors({ error: "La richiesta supera il limite massimo consentito." }, 413, origin);

  let form: FormData;
  try {
    console.info("[PRACTICE_MONOLITHIC] form_parse_start");
    form = await request.formData();
    console.info("[PRACTICE_MONOLITHIC] form_parse_done", { durationMs: Date.now() - startedAt });
  } catch (error) {
    console.error("[PRACTICE_MONOLITHIC] form_parse_failed", error);
    return jsonWithCors({ error: "Dati della richiesta non validi." }, 400, origin);
  }

  if (cleanText(form.get("website"), 200)) {
    return jsonWithCors({ ok: true, practiceCode: `ECN-${Date.now()}`, status: "NEW" }, 200, origin);
  }

  const promotionId = cleanText(form.get("promotionId"), 100);
  const customerType = cleanText(form.get("customerType"), 30).toUpperCase();
  const firstName = cleanText(form.get("firstName"), 70);
  const lastName = cleanText(form.get("lastName"), 70);
  const email = cleanText(form.get("email"), 160).toLowerCase();
  const phoneInput = cleanText(form.get("phone"), 40);
  const phone = `${phoneInput.startsWith("+") ? "+" : ""}${phoneInput.replace(/\D/g, "")}`;
  const province = cleanText(form.get("province"), 60);
  const businessName = cleanText(form.get("businessName"), 140);
  const vatNumber = cleanText(form.get("vatNumber"), 30).replace(/\D/g, "");
  const accountHolder = cleanText(form.get("accountHolder"), 140);
  const iban = normalizeIban(cleanText(form.get("iban"), 40));
  const submissionKey = cleanText(form.get("submissionKey") || request.headers.get("idempotency-key"), 100);
  const privacyAccepted = requiredBoolean(form.get("privacyAccepted"));
  const marketingConsent = requiredBoolean(form.get("marketingConsent"));

  console.info("[PRACTICE_MONOLITHIC] payload_parsed", { promotionId, customerType, email, submissionKey });

  if (!promotionId) return invalid("Offerta non riconosciuta.", origin);
  if (!customerTypes.has(customerType)) return invalid("Seleziona il profilo del richiedente.", origin);
  if (firstName.length < 2 || lastName.length < 2) return invalid("Inserisci nome e cognome completi.", origin);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return invalid("Inserisci un indirizzo email valido.", origin);
  if (phone.replace(/\D/g, "").length < 8 || phone.replace(/\D/g, "").length > 15) return invalid("Inserisci un numero di cellulare valido.", origin);
  if (province.length < 2) return invalid("Inserisci la provincia.", origin);
  if (customerType !== "PRIVATE" && businessName.length < 2) return invalid("Inserisci la denominazione dell’attività.", origin);
  if (customerType !== "PRIVATE" && vatNumber.length !== 11) return invalid("Inserisci una Partita IVA italiana di 11 cifre.", origin);
  if (accountHolder.length < 3) return invalid("Inserisci l’intestatario del conto corrente.", origin);
  if (!validIban(iban)) return invalid("Inserisci un IBAN valido.", origin);
  if (!privacyAccepted) return invalid("Il consenso privacy è necessario per gestire la richiesta.", origin);
  if (submissionKey && !/^[a-zA-Z0-9:_-]{8,100}$/.test(submissionKey)) return invalid("Identificativo di invio non valido.", origin);

  const expectedDocuments = requiredDocuments[customerType];
  const files = expectedDocuments.flatMap((document) => {
    const entries = form.getAll(document.field).filter((entry): entry is File => entry instanceof File && entry.size > 0);
    return entries.map((file, index) => ({ ...document, file, index }));
  });

  console.info("[PRACTICE_MONOLITHIC] documents_parsed", {
    count: files.length,
    documents: files.map((item) => ({ type: item.type, name: item.file.name, size: item.file.size, mime: item.file.type })),
  });

  for (const document of expectedDocuments) {
    const entries = files.filter((file) => file.field === document.field);
    if (!entries.length) return invalid(`Carica: ${document.label}.`, origin);
    if (entries.length > MAX_FILES_PER_REQUIREMENT) return invalid(`${document.label}: puoi caricare al massimo ${MAX_FILES_PER_REQUIREMENT} file.`, origin);
  }

  let totalBytes = 0;
  for (const document of files) {
    totalBytes += document.file.size;
    if (document.file.size > MAX_FILE_BYTES) return invalid(`${document.label}: un file supera 10 MB.`, origin);
    if (!ALLOWED_MIME_TYPES.has(document.file.type)) return invalid(`${document.label}: usa file PDF, JPG o PNG.`, origin);
  }
  if (totalBytes > MAX_TOTAL_BYTES) return jsonWithCors({ error: "La somma degli allegati supera 40 MB." }, 413, origin);

  try {
    await ensurePracticeSchema();
    const db = getDb();

    if (submissionKey) {
      const [existing] = await db.select({ id: leads.id, status: leads.status }).from(leads).where(eq(leads.submissionKey, submissionKey)).limit(1);
      if (existing) {
        console.info("[PRACTICE_MONOLITHIC] duplicate_submission", { practiceCode: existing.id, status: existing.status });
        return jsonWithCors({ ok: true, practiceCode: existing.id, status: existing.status, duplicate: true }, 200, origin);
      }
    }

    const [offer] = await db
      .select({ promotion: promotions, partnerStatus: partners.status })
      .from(promotions)
      .innerJoin(partners, eq(promotions.partnerId, partners.id))
      .where(eq(promotions.id, promotionId))
      .limit(1);
    const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
    if (!offer || !["ONLINE", "ACTIVE", "EXPIRING"].includes(offer.promotion.status) || offer.promotion.validUntil < today) {
      return jsonWithCors({ error: "Questa offerta non è più disponibile. Puoi richiedere una quotazione aggiornata." }, 409, origin);
    }
    if (offer.partnerStatus !== "ACTIVE") {
      return jsonWithCors({ error: "La richiesta non può essere assegnata in questo momento. Riprova più tardi." }, 409, origin);
    }

    const tenMinutesAgo = new Date(Date.now() - 10 * 60_000).toISOString();
    const [recentDuplicate] = await db
      .select({ id: leads.id, status: leads.status })
      .from(leads)
      .where(and(eq(leads.promotionId, promotionId), eq(leads.email, email), gte(leads.createdAt, tenMinutesAgo)))
      .limit(1);
    if (recentDuplicate) {
      console.info("[PRACTICE_MONOLITHIC] duplicate_recent", { practiceCode: recentDuplicate.id, status: recentDuplicate.status });
      return jsonWithCors({ ok: true, practiceCode: recentDuplicate.id, status: recentDuplicate.status, duplicate: true }, 200, origin);
    }

    const id = practiceCode();
    const now = new Date().toISOString();
    const encryptedIban = await encryptSensitivePracticeData(iban);

    await db.insert(leads).values({
      id,
      promotionId,
      partnerId: offer.promotion.partnerId,
      firstName,
      lastName,
      phone,
      email,
      province,
      customerType,
      businessName: businessName || null,
      vatNumber: vatNumber || null,
      accountHolder,
      ibanEncrypted: encryptedIban,
      ibanLast4: iban.slice(-4),
      status: "UPLOAD_IN_PROGRESS",
      documentStatus: "UPLOADING",
      emailVerificationStatus: "NOT_REQUIRED",
      privacyVersion: PRIVACY_VERSION,
      privacyAcceptedAt: now,
      marketingConsent,
      submissionKey: submissionKey || null,
      source: "ECCOMI_NOLEGGIO_WEB",
      assignedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    console.info("[PRACTICE_MONOLITHIC] practice_created", { practiceCode: id, fileCount: files.length });

    try {
      for (let index = 0; index < files.length; index += 1) {
        const document = files[index];
        console.info("[PRACTICE_MONOLITHIC] upload_start", { practiceCode: id, index: index + 1, total: files.length, type: document.type, name: document.file.name });
        const stored = await uploadPracticeDocument({ practiceCode: id, documentType: document.type, file: document.file });
        await db.insert(practiceDocuments).values({
          id: crypto.randomUUID(),
          leadId: id,
          documentType: document.type,
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
        console.info("[PRACTICE_MONOLITHIC] upload_done", { practiceCode: id, index: index + 1, total: files.length, type: document.type });
      }

      await db.update(leads).set({ status: "NEW", documentStatus: "COMPLETE", completedAt: now, updatedAt: now }).where(eq(leads.id, id));
      await db.insert(auditLogs).values({
        id: crypto.randomUUID(),
        actorEmail: "public-form@eccomi.local",
        action: "PRACTICE_CREATED_WITH_DOCUMENTS",
        entityType: "lead",
        entityId: id,
        payloadJson: JSON.stringify({ promotionId, partnerId: offer.promotion.partnerId, customerType, documentCount: files.length, ibanLast4: iban.slice(-4), source: "ECCOMI_NOLEGGIO_WEB" }),
      });
    } catch (error) {
      console.error("[PRACTICE_MONOLITHIC] upload_failed", { practiceCode: id, error });
      await db.update(leads).set({ status: "UPLOAD_ERROR", documentStatus: "ERROR", updatedAt: new Date().toISOString() }).where(eq(leads.id, id));
      return jsonWithCors({ error: error instanceof Error ? error.message : "Caricamento documenti non riuscito." }, 500, origin);
    }

    console.info("[PRACTICE_MONOLITHIC] completed", { practiceCode: id, durationMs: Date.now() - startedAt });
    return jsonWithCors({ ok: true, practiceCode: id, status: "NEW" }, 201, origin);
  } catch (error) {
    console.error("[PRACTICE_MONOLITHIC] fatal", { durationMs: Date.now() - startedAt, error });
    return jsonWithCors({ error: error instanceof Error ? error.message : "Creazione pratica non riuscita." }, 500, origin);
  }
}
