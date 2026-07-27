import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { auditLogs, hubEvents, promotions } from "../../../db/schema";
import type { QuoteDraft } from "../../lib/quote-parser";
import { extractQuoteWithAi } from "../../lib/server/ai";
import { requireActor, routeError } from "../../lib/server/authz";
import { integerFromText, italianDateToIso, listPromotionsForActor, moneyToCents } from "../../lib/server/promotion-service";
import { getRuntimeEnv } from "../../lib/server/runtime";
import { createPromotionDraftOnShopify, isShopifyConfigured } from "../../lib/server/shopify";
import { retrieveVehicleCover } from "../../lib/server/vehicle-image";

const MAX_QUOTE_BYTES = 15 * 1024 * 1024;

function assertDraft(draft: QuoteDraft) {
  const missing = [
    ["numero offerta", draft.offerNumber],
    ["marca", draft.brand],
    ["modello", draft.model],
    ["canone", draft.monthlyGross],
    ["durata", draft.durationMonths],
    ["chilometri", draft.totalKm],
    ["scadenza", draft.validUntil],
  ].filter(([, value]) => !value).map(([label]) => label);
  if (missing.length) throw new Error(`L’AI non ha trovato questi dati obbligatori: ${missing.join(", ")}.`);
}

function parseFallback(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    return JSON.parse(value) as QuoteDraft;
  } catch {
    return null;
  }
}

function jsonArray(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function safeFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 160);
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 1200) : "Errore inatteso.";
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
    const signature = new TextDecoder().decode(bytes.slice(0, 5));
    if (signature !== "%PDF-") return Response.json({ error: "Il file non è un PDF valido." }, { status: 400 });

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

    const partnerId = actor.role === "PARTNER"
      ? actor.partnerId
      : /GOAL\s+RENT/i.test(draft.partner)
        ? "goal-rent"
        : "eccomi-direct";
    if (!partnerId) return Response.json({ error: "Partner non associato all’utente." }, { status: 403 });

    promotionId = crypto.randomUUID();
    quoteKey = `quotations/${partnerId}/${promotionId}/${safeFilename(quote.name) || "quotazione.pdf"}`;
    await getRuntimeEnv().BUCKET.put(quoteKey, bytes, {
      httpMetadata: { contentType: "application/pdf" },
      customMetadata: { promotionId, uploadedBy: actor.email },
    });

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
      servicesJson: JSON.stringify(draft.services),
      warningsJson: JSON.stringify(draft.warnings),
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
      id: crypto.randomUUID(),
      actorEmail: actor.email,
      action: "PROMOTION_AI_EXTRACTED",
      entityType: "promotion",
      entityId: promotionId,
      payloadJson: JSON.stringify({
        offerNumber: draft.offerNumber,
        partnerId,
        provider: draft.provider,
        model: extraction.model,
        confidence: draft.confidence,
      }),
    });

    if (validUntil <= today) throw new Error("La quotazione risulta già scaduta e non può creare una bozza Shopify.");

    const cover = await retrieveVehicleCover({
      brand: draft.brand,
      model: draft.model,
      version: draft.version,
      color: draft.color,
    });
    const extension = cover.mimeType === "image/png" ? "png" : cover.mimeType === "image/webp" ? "webp" : "jpg";
    coverKey = `covers/${partnerId}/${promotionId}/automatic-cover.${extension}`;
    await getRuntimeEnv().BUCKET.put(coverKey, cover.bytes, {
      httpMetadata: { contentType: cover.mimeType },
      customMetadata: {
        promotionId,
        sourceKind: cover.sourceKind,
        sourceUrl: cover.sourceUrl || "",
      },
    });
    await getDb().update(promotions).set({
      coverKey,
      coverSourceKind: cover.sourceKind,
      coverSourceUrl: cover.sourceUrl,
      coverAttribution: cover.attribution,
      updatedAt: new Date().toISOString(),
    }).where(eq(promotions.id, promotionId));
    await getDb().insert(auditLogs).values({
      id: crypto.randomUUID(),
      actorEmail: "ai@eccomi.local",
      action: "PROMOTION_COVER_PREPARED_AUTOMATICALLY",
      entityType: "promotion",
      entityId: promotionId,
      payloadJson: JSON.stringify({ sourceKind: cover.sourceKind, sourceUrl: cover.sourceUrl, attribution: cover.attribution }),
    });

    const shopify = await createPromotionDraftOnShopify({
      id: promotionId,
      offerNumber: draft.offerNumber,
      brand: draft.brand.toUpperCase(),
      model: draft.model,
      version: draft.version,
      provider: draft.provider,
      monthlyGrossCents,
      depositGrossCents: moneyToCents(draft.depositGross),
      durationMonths,
      totalKm,
      validUntil,
      delivery: draft.delivery,
      fuel: draft.fuel,
      transmission: draft.transmission,
      color: draft.color,
      services: jsonArray(JSON.stringify(draft.services)),
      warnings: jsonArray(JSON.stringify(draft.warnings)),
    }, {
      bytes: cover.bytes,
      filename: cover.filename,
      mimeType: cover.mimeType,
      sourceUrl: cover.sourceUrl,
      attribution: cover.attribution,
    });
    await getDb().update(promotions).set({
      shopifyProductId: shopify.productId,
      shopifyHandle: shopify.handle,
      automationStatus: "READY_FOR_CEO",
      automationError: null,
      updatedAt: new Date().toISOString(),
    }).where(eq(promotions.id, promotionId));
    await getDb().insert(auditLogs).values({
      id: crypto.randomUUID(),
      actorEmail: "system@eccomi.local",
      action: "PROMOTION_DRAFT_CREATED_SHOPIFY",
      entityType: "promotion",
      entityId: promotionId,
      payloadJson: JSON.stringify({ productId: shopify.productId, handle: shopify.handle, automatic: true }),
    });
    await getDb().insert(hubEvents).values({
      id: crypto.randomUUID(),
      eventType: "NOLEGGIO_PROMOTION_READY_FOR_CEO",
      ecosystem: "ECCOMI_NOLEGGIO",
      entityType: "promotion",
      entityId: promotionId,
      title: `${draft.brand.toUpperCase()} ${draft.model}: bozza Shopify pronta per il CEO`,
      payloadJson: JSON.stringify({ offerNumber: draft.offerNumber, partnerId, productId: shopify.productId }),
      actorEmail: actor.email,
    });

    const rows = await listPromotionsForActor(actor);
    return Response.json({
      promotion: rows.find((item) => item.id === promotionId),
      workflow: {
        aiExtracted: true,
        coverPrepared: true,
        shopifyDraftCreated: true,
        adminUrl: shopify.adminUrl,
      },
    }, { status: 201 });
  } catch (error) {
    const message = errorText(error);
    if (promotionInserted && promotionId) {
      await getDb().update(promotions).set({
        automationStatus: "FAILED",
        automationError: message,
        updatedAt: new Date().toISOString(),
      }).where(eq(promotions.id, promotionId)).catch(() => undefined);
      await getDb().insert(auditLogs).values({
        id: crypto.randomUUID(),
        actorEmail: actorEmail || "system@eccomi.local",
        action: "PROMOTION_AUTOMATION_FAILED",
        entityType: "promotion",
        entityId: promotionId,
        payloadJson: JSON.stringify({ error: message }),
      }).catch(() => undefined);
    } else {
      if (quoteKey) await getRuntimeEnv().BUCKET.delete(quoteKey).catch(() => undefined);
      if (coverKey) await getRuntimeEnv().BUCKET.delete(coverKey).catch(() => undefined);
    }
    if (/UNIQUE constraint failed/i.test(message)) {
      return Response.json({ error: "Questa quotazione risulta già caricata." }, { status: 409 });
    }
    const response = routeError(error);
    if (promotionId && response instanceof Response) {
      const payload = await response.clone().json().catch(() => ({ error: message })) as Record<string, unknown>;
      return Response.json({ ...payload, promotionId }, { status: response.status });
    }
    return response;
  }
}
