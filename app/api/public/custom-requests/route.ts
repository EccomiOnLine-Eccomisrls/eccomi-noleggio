import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { customVehicleRequests } from "../../../../db/schema";
import { ensureCustomRequestSchema } from "../../../lib/server/custom-request-schema";
import {
  corsHeaders,
  jsonWithCors,
  publicCorsOrigin,
} from "../../../lib/server/public-origin";

const PRIVACY_VERSION = "ECCOMI-NOLEGGIO-2026-08";
const customerTypes = new Set(["PRIVATE", "PROFESSIONAL", "COMPANY"]);

function clean(value: unknown, max: number) {
  return typeof value === "string"
    ? value.trim().replace(/\s+/g, " ").slice(0, max)
    : "";
}

function optionalInteger(
  value: unknown,
  minimum: number,
  maximum: number,
) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);

  if (
    !Number.isInteger(parsed)
    || parsed < minimum
    || parsed > maximum
  ) {
    return null;
  }

  return parsed;
}

function requestCode() {
  const day = new Date()
    .toLocaleDateString("sv-SE", {
      timeZone: "Europe/Rome",
    })
    .replaceAll("-", "");

  const suffix = crypto
    .randomUUID()
    .replaceAll("-", "")
    .slice(0, 6)
    .toUpperCase();

  return `ECR-${day}-${suffix}`;
}

export async function OPTIONS(request: Request) {
  const origin = await publicCorsOrigin(request);

  if (!origin) {
    return jsonWithCors(
      { error: "Origine non autorizzata." },
      403,
      null,
    );
  }

  return new Response(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const origin = await publicCorsOrigin(request);

  if (!origin) {
    return jsonWithCors(
      { error: "Origine non autorizzata." },
      403,
      null,
    );
  }

  let body: Record<string, unknown>;

  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return jsonWithCors(
      { error: "Dati della richiesta non validi." },
      400,
      origin,
    );
  }

  const customerType = clean(body.customerType, 30).toUpperCase();
  const firstName = clean(body.firstName, 70);
  const lastName = clean(body.lastName, 70);
  const email = clean(body.email, 160).toLowerCase();

  const phoneInput = clean(body.phone, 40);
  const phone =
    `${phoneInput.startsWith("+") ? "+" : ""}${phoneInput.replace(/\D/g, "")}`;

  const province = clean(body.province, 60);
  const businessName = clean(body.businessName, 140);
  const vatNumber = clean(body.vatNumber, 30).replace(/\D/g, "");

  const brand = clean(body.brand, 80);
  const modelOrSegment = clean(body.modelOrSegment, 160);
  const fuel = clean(body.fuel, 60);
  const transmission = clean(body.transmission, 60);
  const deliveryTiming = clean(body.deliveryTiming, 100);
  const notes = clean(body.notes, 2000);

  const monthlyBudgetCents = optionalInteger(
    body.monthlyBudgetCents,
    0,
    10_000_000,
  );

  const maxDepositCents = optionalInteger(
    body.maxDepositCents,
    0,
    100_000_000,
  );

  const durationMonths = optionalInteger(
    body.durationMonths,
    1,
    120,
  );

  const annualKm = optionalInteger(
    body.annualKm,
    1,
    500_000,
  );

  const submissionKey = clean(body.submissionKey, 100);
  const privacyAccepted = body.privacyAccepted === true;
  const marketingConsent = body.marketingConsent === true;
  const website = clean(body.website, 300);

  if (website) {
    return jsonWithCors(
      {
        ok: true,
        requestCode: requestCode(),
        status: "NEW",
      },
      200,
      origin,
    );
  }

  if (!customerTypes.has(customerType)) {
    return jsonWithCors(
      { error: "Seleziona il tipo di cliente." },
      422,
      origin,
    );
  }

  if (firstName.length < 2 || lastName.length < 2) {
    return jsonWithCors(
      { error: "Inserisci nome e cognome completi." },
      422,
      origin,
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonWithCors(
      { error: "Inserisci un indirizzo email valido." },
      422,
      origin,
    );
  }

  const phoneDigits = phone.replace(/\D/g, "");

  if (phoneDigits.length < 8 || phoneDigits.length > 15) {
    return jsonWithCors(
      { error: "Inserisci un numero di cellulare valido." },
      422,
      origin,
    );
  }

  if (province.length < 2) {
    return jsonWithCors(
      { error: "Inserisci la provincia." },
      422,
      origin,
    );
  }

  if (
    customerType !== "PRIVATE"
    && businessName.length < 2
  ) {
    return jsonWithCors(
      { error: "Inserisci la denominazione dell’attività." },
      422,
      origin,
    );
  }

  if (
    customerType !== "PRIVATE"
    && vatNumber.length !== 11
  ) {
    return jsonWithCors(
      { error: "Inserisci una Partita IVA italiana di 11 cifre." },
      422,
      origin,
    );
  }

  if (!brand && !modelOrSegment) {
    return jsonWithCors(
      {
        error:
          "Indica almeno una marca, un modello o la tipologia di auto desiderata.",
      },
      422,
      origin,
    );
  }

  if (!privacyAccepted) {
    return jsonWithCors(
      {
        error:
          "Il consenso privacy è necessario per gestire la richiesta.",
      },
      422,
      origin,
    );
  }

  if (!/^[a-zA-Z0-9:_-]{8,100}$/.test(submissionKey)) {
    return jsonWithCors(
      { error: "Identificativo di invio non valido." },
      422,
      origin,
    );
  }

  try {
    await ensureCustomRequestSchema();

    const db = getDb();

    const [existing] = await db
      .select({
        id: customVehicleRequests.id,
        status: customVehicleRequests.status,
      })
      .from(customVehicleRequests)
      .where(
        eq(
          customVehicleRequests.submissionKey,
          submissionKey,
        ),
      )
      .limit(1);

    if (existing) {
      return jsonWithCors(
        {
          ok: true,
          requestCode: existing.id,
          status: existing.status,
          duplicate: true,
        },
        200,
        origin,
      );
    }

    const id = requestCode();
    const now = new Date().toISOString();

    await db.insert(customVehicleRequests).values({
      id,
      customerType,
      firstName,
      lastName,
      email,
      phone,
      province,
      businessName: businessName || null,
      vatNumber: vatNumber || null,
      brand: brand || null,
      modelOrSegment: modelOrSegment || null,
      monthlyBudgetCents,
      maxDepositCents,
      durationMonths,
      annualKm,
      fuel: fuel || null,
      transmission: transmission || null,
      deliveryTiming: deliveryTiming || null,
      notes: notes || null,
      status: "NEW",
      assignedTo: null,
      privacyVersion: PRIVACY_VERSION,
      privacyAcceptedAt: now,
      marketingConsent,
      submissionKey,
      source: "ECCOMI_NOLEGGIO_CUSTOM_REQUEST",
      createdAt: now,
      updatedAt: now,
    });

    console.info("[CUSTOM_REQUEST] created", {
      requestCode: id,
      customerType,
      email,
      durationMs: Date.now() - startedAt,
    });

    return jsonWithCors(
      {
        ok: true,
        requestCode: id,
        status: "NEW",
      },
      201,
      origin,
    );
  } catch (error) {
    console.error("[CUSTOM_REQUEST] fatal", {
      email,
      submissionKey,
      durationMs: Date.now() - startedAt,
      error,
    });

    return jsonWithCors(
      {
        error:
          error instanceof Error
            ? error.message
            : "Invio della richiesta non riuscito.",
      },
      500,
      origin,
    );
  }
}
