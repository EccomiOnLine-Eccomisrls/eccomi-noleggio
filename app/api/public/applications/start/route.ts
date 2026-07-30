import { and, eq, gte } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { leads, partners, promotions } from "../../../../../db/schema";
import { encryptSensitivePracticeData } from "../../../../lib/server/credential-crypto";
import { ensurePracticeSchema } from "../../../../lib/server/practice-schema";
import { corsHeaders, jsonWithCors, publicCorsOrigin } from "../../../../lib/server/public-origin";

const PRIVACY_VERSION = "ECCOMI-NOLEGGIO-2026-07";
const customerTypes = new Set(["PRIVATE", "PROFESSIONAL", "COMPANY"]);

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : "";
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

function practiceCode() {
  const day = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" }).replaceAll("-", "");
  return `ECN-${day}-${crypto.randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase()}`;
}

export async function OPTIONS(request: Request) {
  const origin = await publicCorsOrigin(request);
  if (!origin) return jsonWithCors({ error: "Origine non autorizzata." }, 403, null);
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const origin = await publicCorsOrigin(request);
  console.info("[PRACTICE_START] request_received", { origin: origin || "DENIED" });
  if (!origin) return jsonWithCors({ error: "Origine non autorizzata." }, 403, null);

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch (error) {
    console.error("[PRACTICE_START] invalid_json", error);
    return jsonWithCors({ error: "Dati della richiesta non validi." }, 400, origin);
  }

  const promotionId = clean(body.promotionId, 100);
  const customerType = clean(body.customerType, 30).toUpperCase();
  const firstName = clean(body.firstName, 70);
  const lastName = clean(body.lastName, 70);
  const email = clean(body.email, 160).toLowerCase();
  const phoneInput = clean(body.phone, 40);
  const phone = `${phoneInput.startsWith("+") ? "+" : ""}${phoneInput.replace(/\D/g, "")}`;
  const province = clean(body.province, 60);
  const businessName = clean(body.businessName, 140);
  const vatNumber = clean(body.vatNumber, 30).replace(/\D/g, "");
  const accountHolder = clean(body.accountHolder, 140);
  const iban = normalizeIban(clean(body.iban, 40));
  const submissionKey = clean(body.submissionKey, 100);
  const privacyAccepted = body.privacyAccepted === true;
  const marketingConsent = body.marketingConsent === true;

  console.info("[PRACTICE_START] payload_parsed", { promotionId, customerType, email, submissionKey });

  if (!promotionId) return jsonWithCors({ error: "Offerta non riconosciuta." }, 422, origin);
  if (!customerTypes.has(customerType)) return jsonWithCors({ error: "Seleziona il profilo del richiedente." }, 422, origin);
  if (firstName.length < 2 || lastName.length < 2) return jsonWithCors({ error: "Inserisci nome e cognome completi." }, 422, origin);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonWithCors({ error: "Inserisci un indirizzo email valido." }, 422, origin);
  if (phone.replace(/\D/g, "").length < 8 || phone.replace(/\D/g, "").length > 15) return jsonWithCors({ error: "Inserisci un numero di cellulare valido." }, 422, origin);
  if (province.length < 2) return jsonWithCors({ error: "Inserisci la provincia." }, 422, origin);
  if (customerType !== "PRIVATE" && businessName.length < 2) return jsonWithCors({ error: "Inserisci la denominazione dell’attività." }, 422, origin);
  if (customerType !== "PRIVATE" && vatNumber.length !== 11) return jsonWithCors({ error: "Inserisci una Partita IVA italiana di 11 cifre." }, 422, origin);
  if (accountHolder.length < 3) return jsonWithCors({ error: "Inserisci l’intestatario del conto corrente." }, 422, origin);
  if (!validIban(iban)) return jsonWithCors({ error: "Inserisci un IBAN valido." }, 422, origin);
  if (!privacyAccepted) return jsonWithCors({ error: "Il consenso privacy è necessario per gestire la richiesta." }, 422, origin);
  if (!/^[a-zA-Z0-9:_-]{8,100}$/.test(submissionKey)) return jsonWithCors({ error: "Identificativo di invio non valido." }, 422, origin);

  try {
    await ensurePracticeSchema();
    const db = getDb();
    const [existing] = await db.select({ id: leads.id, status: leads.status }).from(leads).where(eq(leads.submissionKey, submissionKey)).limit(1);
    if (existing) {
      console.info("[PRACTICE_START] duplicate_submission", { practiceCode: existing.id, status: existing.status, durationMs: Date.now() - startedAt });
      return jsonWithCors({ ok: true, practiceCode: existing.id, status: existing.status, duplicate: true }, 200, origin);
    }

    const [offer] = await db.select({ promotion: promotions, partnerStatus: partners.status })
      .from(promotions)
      .innerJoin(partners, eq(promotions.partnerId, partners.id))
      .where(eq(promotions.id, promotionId))
      .limit(1);
    const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
    if (!offer || !["ONLINE", "ACTIVE", "EXPIRING"].includes(offer.promotion.status) || offer.promotion.validUntil < today) {
      console.warn("[PRACTICE_START] offer_unavailable", { promotionId });
      return jsonWithCors({ error: "Questa offerta non è più disponibile." }, 409, origin);
    }
    if (offer.partnerStatus !== "ACTIVE") return jsonWithCors({ error: "La richiesta non può essere assegnata in questo momento." }, 409, origin);

    const tenMinutesAgo = new Date(Date.now() - 10 * 60_000).toISOString();
    const [recent] = await db.select({ id: leads.id, status: leads.status }).from(leads)
      .where(and(eq(leads.promotionId, promotionId), eq(leads.email, email), gte(leads.createdAt, tenMinutesAgo))).limit(1);
    if (recent) {
      console.info("[PRACTICE_START] duplicate_recent", { practiceCode: recent.id, status: recent.status, durationMs: Date.now() - startedAt });
      return jsonWithCors({ ok: true, practiceCode: recent.id, status: recent.status, duplicate: true }, 200, origin);
    }

    const id = practiceCode();
    const now = new Date().toISOString();
    const encryptedIban = await encryptSensitivePracticeData(iban);
    await db.insert(leads).values({
      id, promotionId, partnerId: offer.promotion.partnerId, firstName, lastName, phone, email, province, customerType,
      businessName: businessName || null, vatNumber: vatNumber || null, accountHolder, ibanEncrypted: encryptedIban,
      ibanLast4: iban.slice(-4), status: "UPLOAD_IN_PROGRESS", documentStatus: "UPLOADING", emailVerificationStatus: "NOT_REQUIRED",
      privacyVersion: PRIVACY_VERSION, privacyAcceptedAt: now, marketingConsent, submissionKey, source: "ECCOMI_NOLEGGIO_WEB",
      assignedAt: now, createdAt: now, updatedAt: now,
    });
    console.info("[PRACTICE_START] created", { practiceCode: id, promotionId, customerType, durationMs: Date.now() - startedAt });
    return jsonWithCors({ ok: true, practiceCode: id, status: "UPLOAD_IN_PROGRESS" }, 201, origin);
  } catch (error) {
    console.error("[PRACTICE_START] fatal", { promotionId, email, submissionKey, durationMs: Date.now() - startedAt, error });
    return jsonWithCors({ error: error instanceof Error ? error.message : "Creazione pratica non riuscita." }, 500, origin);
  }
}
