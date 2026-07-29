import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { auditLogs, hubEvents, promotions } from "../../../db/schema";
import type { QuoteDraft } from "../../lib/quote-parser";
import { extractQuoteWithAi } from "../../lib/server/ai";
import { requireActor, routeError } from "../../lib/server/authz";
import { integerFromText, italianDateToIso, listPromotionsForActor, moneyToCents } from "../../lib/server/promotion-service";
import { storageDelete, storagePut } from "../../lib/server/storage";
import { createPromotionDraftOnShopify, isShopifyConfigured } from "../../lib/server/shopify";
import { applyEccomiEditorialRules } from "../../lib/server/shopify-editorial";
import { retrieveVehicleCover } from "../../lib/server/vehicle-image";

const MAX_QUOTE_BYTES = 15 * 1024 * 1024;
const DUPLICATE_WARNING = "Attenzione: esiste già una quotazione con lo stesso numero offerta e lo stesso noleggiatore. La nuova proposta è stata comunque preparata in bozza e richiede valutazione.";

function assertDraft(draft: QuoteDraft) {
  const missing = [
    ["numero offerta", draft.offerNumber], ["marca", draft.brand], ["modello", draft.model],
    ["canone", draft.monthlyGross], ["durata", draft.durationMonths], ["chilometri", draft.totalKm],
    ["scadenza", draft.validUntil],
  ].filter(([, value]) => !value).map(([label]) => label);
  if (missing.length) throw new Error(`L’AI non ha trovato questi dati obbligatori: ${missing.join(", ")}.`);
}

function parseFallback(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) return null;
  try { return JSON.parse(value) as QuoteDraft; } catch { return null; }
}

function jsonArray(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch { return []; }
}

function safeFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 160);
}

function errorText(error: unknown) {
  if (error instanceof Error) {
    const cause = error.cause instanceof Error ? ` ${error.cause.message}` : "";
    return `${error.message}${cause}`.slice(0, 1200);
  }
  return "Errore inatteso.";
}

export async function POST(request: Request) {
  let quoteKey = "";
  let coverKey = "";
  let promotionId = "";
  let promotionInserted = false;
  let actorEmail = "";

  try {
    const actor = await requireActor(request);
    actorEmail = actor.email;
    if (!await isShopifyConfigured()) {
      return Response.json({ error: "Collega prima Shopify: la bozza deve essere creata automaticamente." }, { status: 409 });
    }

    const formData = await request.formData();
    const quote = formData.get("quote");
    if (!(quote instanceof File)) return Response.json({ error: "Quotazione PDF mancante." }, { status: 400 });
    if (quote.size <= 0 || quote.size > MAX_QUOTE_BYTES) return Response.json({ error: "Il PDF deve pesare meno di 15 MB." }, { status: 400 });
    if (!quote.name.toLowerCase().endsWith(".pdf") && quote.type !== "application/pdf") return Response.json({ error: "Il file deve essere un PDF." }, { status: 400 });

    const bytes = await quote.arrayBuffer();
    if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") {
      return Response.json({ error: "Il file non è un PDF valido." }, { status: 400 });
    }

    const extraction = await extractQuoteWithAi(bytes, quote.name, parseFallback(formData.get("fallbackDraft")));
    const draft = extraction.draft;
    assertDraft(draft);

    const validUntil = italianDateToIso(draft.validUntil);
    if (!validUntil) return Response.json({ error: "L’AI non ha riconosciuto correttamente la data di scadenza." }, { status: 422 });
    const monthlyGrossCents = moneyToCents(draft.monthlyGross);
    const durationMonths = integerFromText(draft.durationMonths);
    const totalKm = integerFromText(draft.totalKm);
    if (!monthlyGrossCents || !durationMonths || !totalKm) {
      return Response.json({ error: "L’AI non ha riconosciuto correttamente canone, durata o chilometri." }, { status: 422 });
    }

    const partnerId = actor.role === "PARTNER" ? actor.partnerId : /GOAL\s+RENT/i.test(draft.partner) ? "goal-rent" : "eccomi-direct";
    if (!partnerId) return Response.json({ error: "Partner non associato all’utente." }, { status: 403 });

    // La ripetizione non blocca più il flusso: viene solo segnalata al validatore.
    const [similarQuotation] = await getDb()
      .select({ id: promotions.id, status: promotions.status })
      .from(promotions)
      .where(and(eq(promotions.offerNumber, draft.offerNumber), eq(promotions.provider, draft.provider)))
      .limit(1);
    const duplicateWarning = Boolean(similarQuotation);

    // Rimuove anche sui database già esistenti il vecchio vincolo che impediva la valutazione umana.
    await getDb().execute(sql`DROP INDEX IF EXISTS promotions_offer_provider_idx`);
    await getDb().execute(sql`CREATE INDEX IF NOT EXISTS promotions_offer_provider_idx ON promotions (offer_number, provider)`);

    promotionId = crypto.randomUUID();
    quoteKey = `quotations/${partnerId}/${promotionId}/${safeFilename(quote.name) || "quotazione.pdf"}`;
    await storagePut(quoteKey, bytes, "application/pdf");

    const services = jsonArray(JSON.stringify(draft.services));
    const originalWarnings = jsonArray(JSON.stringify(draft.warnings));
    const warnings = duplicateWarning ? [DUPLICATE_WARNING, ...originalWarnings] : originalWarnings;
    const now = new Date().toISOString();
    const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });

    await getDb().insert(promotions).values({
      id: promotionId,
      offerNumber: draft.offerNumber,
      provider: draft.provider,
      partnerId,
      sourceLabel: actor.role === "CEO" && partnerId === "eccomi-direct" ? "Caricata dal CEO" : "Partner operativo",
      brand: draft.brand.toUpperCase(),
      model: draft.model,
      version: draft.version,
      monthlyGrossCents,
      monthlyNetCents: draft.monthlyNet ? moneyToCents(draft.monthlyNet) : null,
      depositGrossCents: moneyToCents(draft.depositGross),
      durationMonths,
      totalKm,
      validFrom: italianDateToIso(draft.validFrom) || null,
      validUntil,
      delivery: draft.delivery,
      fuel: draft.fuel,
      transmission: draft.transmission,
      color: draft.color,
      powerKw: draft.powerKw,
      servicesJson: JSON.stringify(services),
      warningsJson: JSON.stringify(warnings),
      confidence: draft.confidence,
      status: validUntil <= today ? "EXPIRED" : "PENDING_APPROVAL",
      quoteKey,
      quoteFileName: quote.name,
      automationStatus: validUntil <= today ? "FAILED" : "PROCESSING",
      automationError: validUntil <= today ? "La quotazione risulta già scaduta." : null,
      extractionMethod: `OPENAI:${extraction.model}`,
      createdBy: actor.email,
      createdAt: now,
      updatedAt: now,
    });
    promotionInserted = true;

    await getDb().insert(auditLogs).values({
      id: crypto.randomUUID(), actorEmail: actor.email, action: "PROMOTION_AI_EXTRACTED",
      entityType: "promotion", entityId: promotionId,
      payloadJson: JSON.stringify({ offerNumber: draft.offerNumber, partnerId, provider: draft.provider, model: extraction.model, confidence: draft.confidence, duplicateWarning, similarPromotionId: similarQuotation?.id || null }),
    });

    if (validUntil <= today) throw new Error("La quotazione risulta già scaduta e non può creare una bozza Shopify.");

    const cover = await retrieveVehicleCover({ brand: draft.brand, model: draft.model, version: draft.version, color: draft.color });
    const extension = cover.mimeType === "image/png" ? "png" : cover.mimeType === "image/webp" ? "webp" : "jpg";
    coverKey = `covers/${partnerId}/${promotionId}/automatic-cover.${extension}`;
    await storagePut(coverKey, cover.bytes, cover.mimeType);
    await getDb().update(promotions).set({ coverKey, coverSourceKind: cover.sourceKind, coverSourceUrl: cover.sourceUrl, coverAttribution: cover.attribution, updatedAt: new Date().toISOString() }).where(eq(promotions.id, promotionId));

    await getDb().insert(auditLogs).values({
      id: crypto.randomUUID(), actorEmail: "ai@eccomi.local", action: "PROMOTION_COVER_PREPARED_AUTOMATICALLY",
      entityType: "promotion", entityId: promotionId,
      payloadJson: JSON.stringify({ sourceKind: cover.sourceKind, sourceUrl: cover.sourceUrl, attribution: cover.attribution }),
    });

    const shopify = await createPromotionDraftOnShopify({
      id: promotionId, offerNumber: draft.offerNumber, brand: draft.brand.toUpperCase(), model: draft.model,
      version: draft.version, provider: draft.provider, monthlyGrossCents,
      depositGrossCents: moneyToCents(draft.depositGross), durationMonths, totalKm, validUntil,
      delivery: draft.delivery, fuel: draft.fuel, transmission: draft.transmission, color: draft.color,
      services, warnings,
    }, { bytes: cover.bytes, filename: cover.filename, mimeType: cover.mimeType, sourceUrl: cover.sourceUrl, attribution: cover.attribution });

    const editorial = await applyEccomiEditorialRules({
      productId: shopify.productId,
      promotion: { id: promotionId, brand: draft.brand, model: draft.model, version: draft.version, monthlyGrossCents, depositGrossCents: moneyToCents(draft.depositGross), durationMonths, totalKm, delivery: draft.delivery, services },
    });

    await getDb().update(promotions).set({ shopifyProductId: shopify.productId, shopifyHandle: shopify.handle, automationStatus: "READY_FOR_CEO", automationError: null, updatedAt: new Date().toISOString() }).where(eq(promotions.id, promotionId));

    await getDb().insert(auditLogs).values({
      id: crypto.randomUUID(), actorEmail: "system@eccomi.local", action: "PROMOTION_DRAFT_CREATED_SHOPIFY",
      entityType: "promotion", entityId: promotionId,
      payloadJson: JSON.stringify({ productId: shopify.productId, handle: shopify.handle, automatic: true, editorial, status: "DRAFT", approvalRequired: true, duplicateWarning }),
    });

    await getDb().insert(hubEvents).values({
      id: crypto.randomUUID(), eventType: "NOLEGGIO_PROMOTION_READY_FOR_CEO", ecosystem: "ECCOMI_NOLEGGIO",
      entityType: "promotion", entityId: promotionId,
      title: `${editorial.title}: bozza Shopify pronta per il CEO`,
      payloadJson: JSON.stringify({ offerNumber: draft.offerNumber, partnerId, productId: shopify.productId, status: "DRAFT", approvalRequired: true, duplicateWarning, warning: duplicateWarning ? DUPLICATE_WARNING : null }),
      actorEmail: actor.email,
    });

    const rows = await listPromotionsForActor(actor);
    return Response.json({
      promotion: rows.find((item) => item.id === promotionId),
      warning: duplicateWarning ? DUPLICATE_WARNING : null,
      workflow: { aiExtracted: true, coverPrepared: true, shopifyDraftCreated: true, editorialRulesApplied: true, status: "READY_FOR_CEO", requiresCeoApproval: true, duplicateWarning, adminUrl: shopify.adminUrl },
    }, { status: 201 });
  } catch (error) {
    const message = errorText(error);
    if (promotionInserted && promotionId) {
      await getDb().update(promotions).set({ automationStatus: "FAILED", automationError: message, updatedAt: new Date().toISOString() }).where(eq(promotions.id, promotionId)).catch(() => undefined);
      await getDb().insert(auditLogs).values({ id: crypto.randomUUID(), actorEmail: actorEmail || "system@eccomi.local", action: "PROMOTION_AUTOMATION_FAILED", entityType: "promotion", entityId: promotionId, payloadJson: JSON.stringify({ error: message }) }).catch(() => undefined);
    } else {
      if (quoteKey) await storageDelete(quoteKey).catch(() => undefined);
      if (coverKey) await storageDelete(coverKey).catch(() => undefined);
    }
    const response = routeError(error);
    if (promotionId && response instanceof Response) {
      const payload = await response.clone().json().catch(() => ({ error: message })) as Record<string, unknown>;
      return Response.json({ ...payload, promotionId }, { status: response.status });
    }
    return response;
  }
}
