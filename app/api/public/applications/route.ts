import { and, eq, gte } from "drizzle-orm";
import { getDb } from "../../../../db";
import { auditLogs, leads, partners, promotions } from "../../../../db/schema";
import { corsHeaders, jsonWithCors, publicCorsOrigin } from "../../../lib/server/public-origin";

const PRIVACY_VERSION = "ECCOMI-NOLEGGIO-2026-07";
const customerTypes = new Set(["PRIVATE", "PROFESSIONAL", "COMPANY"]);

type ApplicationInput = {
  promotionId?: unknown;
  customerType?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  email?: unknown;
  phone?: unknown;
  province?: unknown;
  businessName?: unknown;
  vatNumber?: unknown;
  privacyAccepted?: unknown;
  marketingConsent?: unknown;
  submissionKey?: unknown;
  website?: unknown;
};

function cleanText(value: unknown, maxLength: number) {
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

export async function OPTIONS(request: Request) {
  const origin = await publicCorsOrigin(request);
  if (!origin) return jsonWithCors({ error: "Origine non autorizzata." }, 403, null);
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

export async function POST(request: Request) {
  const origin = await publicCorsOrigin(request);
  if (!origin) return jsonWithCors({ error: "Origine non autorizzata." }, 403, null);

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 32_768) return jsonWithCors({ error: "Richiesta troppo grande." }, 413, origin);

  let body: ApplicationInput;
  try {
    body = await request.json() as ApplicationInput;
  } catch {
    return jsonWithCors({ error: "Dati della richiesta non validi." }, 400, origin);
  }

  if (cleanText(body.website, 200)) {
    return jsonWithCors({ ok: true, practiceCode: `ECN-${Date.now()}`, status: "NEW" }, 200, origin);
  }

  const promotionId = cleanText(body.promotionId, 100);
  const customerType = cleanText(body.customerType, 30).toUpperCase();
  const firstName = cleanText(body.firstName, 70);
  const lastName = cleanText(body.lastName, 70);
  const email = cleanText(body.email, 160).toLowerCase();
  const phoneInput = cleanText(body.phone, 40);
  const phone = `${phoneInput.startsWith("+") ? "+" : ""}${phoneInput.replace(/\D/g, "")}`;
  const province = cleanText(body.province, 60);
  const businessName = cleanText(body.businessName, 140);
  const vatNumber = cleanText(body.vatNumber, 30).replace(/\D/g, "");
  const submissionKey = cleanText(body.submissionKey || request.headers.get("idempotency-key"), 100);

  if (!promotionId) return invalid("Offerta non riconosciuta.", origin);
  if (!customerTypes.has(customerType)) return invalid("Seleziona il profilo del richiedente.", origin);
  if (firstName.length < 2 || lastName.length < 2) return invalid("Inserisci nome e cognome completi.", origin);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return invalid("Inserisci un indirizzo email valido.", origin);
  if (phone.replace(/\D/g, "").length < 8 || phone.replace(/\D/g, "").length > 15) return invalid("Inserisci un numero di cellulare valido.", origin);
  if (province.length < 2) return invalid("Inserisci la provincia.", origin);
  if (customerType !== "PRIVATE" && businessName.length < 2) return invalid("Inserisci la denominazione dell’attività.", origin);
  if (customerType !== "PRIVATE" && vatNumber.length !== 11) return invalid("Inserisci una Partita IVA italiana di 11 cifre.", origin);
  if (body.privacyAccepted !== true) return invalid("Il consenso privacy è necessario per gestire la richiesta.", origin);
  if (submissionKey && !/^[a-zA-Z0-9:_-]{8,100}$/.test(submissionKey)) return invalid("Identificativo di invio non valido.", origin);

  const db = getDb();
  if (submissionKey) {
    const [existing] = await db.select({ id: leads.id, status: leads.status }).from(leads).where(eq(leads.submissionKey, submissionKey)).limit(1);
    if (existing) return jsonWithCors({ ok: true, practiceCode: existing.id, status: existing.status, duplicate: true }, 200, origin);
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
    return jsonWithCors({ ok: true, practiceCode: recentDuplicate.id, status: recentDuplicate.status, duplicate: true }, 200, origin);
  }

  const id = practiceCode();
  const now = new Date().toISOString();
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
    status: "NEW",
    documentStatus: "PENDING_EMAIL_VERIFICATION",
    emailVerificationStatus: "PENDING",
    privacyVersion: PRIVACY_VERSION,
    privacyAcceptedAt: now,
    marketingConsent: body.marketingConsent === true,
    submissionKey: submissionKey || null,
    source: "ECCOMI_NOLEGGIO_WEB",
    assignedAt: now,
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(auditLogs).values({
    id: crypto.randomUUID(),
    actorEmail: "public-form@eccomi.local",
    action: "LEAD_CREATED_AND_ASSIGNED",
    entityType: "lead",
    entityId: id,
    payloadJson: JSON.stringify({ promotionId, partnerId: offer.promotion.partnerId, customerType, source: "ECCOMI_NOLEGGIO_WEB" }),
  });

  return jsonWithCors({ ok: true, practiceCode: id, status: "NEW" }, 201, origin);
}
