import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("PR38 precompila la richiesta leggera da Shopify e Ads", async () => {
  const page = await read("app/richiesta/page.tsx");
  const client = await read("app/richiesta/custom-request-client.tsx");

  assert.match(page, /params\.auto/);
  assert.match(page, /params\.source/);
  assert.match(page, /initialVehicle=\{initialVehicle\}/);
  assert.match(page, /source=\{source\}/);

  assert.match(client, /initialVehicle = ""/);
  assert.match(client, /modelOrSegment: initialVehicle/);
  assert.match(client, /source,/);
  assert.doesNotMatch(client, /accountHolder/);
  assert.doesNotMatch(client, /\biban\b/i);
});

test("PR38 non obbliga ragione sociale e partita IVA nel primo contatto", async () => {
  const client = await read("app/richiesta/custom-request-client.tsx");
  const api = await read("app/api/public/custom-requests/route.ts");

  assert.match(client, /return baseComplete;/);
  assert.doesNotMatch(
    api,
    /Inserisci la denominazione dell’attività\./,
  );
  assert.doesNotMatch(
    api,
    /Inserisci una Partita IVA italiana di 11 cifre\./,
  );
  assert.doesNotMatch(client, /<span>Partita IVA<\/span>/);
  assert.doesNotMatch(client, /Ragione sociale/);
});

test("PR38 non scrive dati reali durante il Render PR preview", async () => {
  const api = await read("app/api/public/custom-requests/route.ts");
  const previewCheck = api.indexOf("isRenderPullRequestPreview(request)");
  const schemaWrite = api.indexOf("await ensureCustomRequestSchema()");

  assert.ok(previewCheck >= 0);
  assert.ok(schemaWrite > previewCheck);
  assert.match(api, /ECR-PREVIEW-000001/);
  assert.match(api, /preview: true/);
});

test("PR38 conserva la sorgente commerciale del lead", async () => {
  const api = await read("app/api/public/custom-requests/route.ts");

  assert.match(api, /ECCOMI_NOLEGGIO_ADS/);
  assert.match(api, /ECCOMI_NOLEGGIO_SHOPIFY_PRODUCT/);
  assert.match(api, /ECCOMI_NOLEGGIO_SHOPIFY_LANDING/);
  assert.match(api, /source: requestSource/);
});

test("PR38 porta i lead rapidi nel cruscotto interno senza esporli ai Partner", async () => {
  const route = await read("app/api/dashboard/route.ts");
  const client = await read("app/dashboard-client.tsx");

  assert.match(route, /customVehicleRequests/);
  assert.match(route, /isPartnerNoleggioRole\(actor\.role\)\s*\? \[\]/);
  assert.match(route, /documentStatus: "LEAD_RAPIDO"/);
  assert.match(route, /partnerName: "ECCOMI"/);
  assert.match(route, /INTERESSE DA SCHEDA/);
  assert.match(route, /AUTO SU MISURA/);

  assert.match(client, /Lead rapido · documenti non richiesti/);
  assert.match(
    client,
    /Lead commerciali e pratiche complete in un unico punto operativo\./,
  );
});

test("PR38 mette il lead rapido prima della pratica completa per una specifica offerta", async () => {
  const page = await read("app/richiesta/page.tsx");

  assert.match(
    page,
    /import OfferInterestClient from "\.\/offer-interest-client"/,
  );
  assert.match(page, /params\.completa === "1"/);
  assert.match(page, /<OfferInterestClient\s+promotionId=\{promotionId\}/);
  assert.match(page, /<RequestClient promotionId=\{promotionId\}/);

  const interestPosition = page.indexOf("<OfferInterestClient");
  const fullPracticePosition = page.indexOf("<RequestClient promotionId={promotionId}");

  assert.ok(interestPosition >= 0);
  assert.ok(fullPracticePosition > interestPosition);
});

test("PR38 cattura interesse da scheda senza IBAN o documenti e traccia solo un nuovo lead reale", async () => {
  const client = await read("app/richiesta/offer-interest-client.tsx");

  assert.doesNotMatch(client, /accountHolder/);
  assert.doesNotMatch(client, /\biban\b/i);
  assert.doesNotMatch(client, /document_identity|document_income|document_chamber/);
  assert.match(client, /source: "shopify-product"/);
  assert.match(client, /response\.status === 201/);
  assert.match(client, /trackLeadCreated\(\)/);
  assert.match(client, /Nessun documento o IBAN richiesto ora\./);
});

test("PR38 recupera anche un'offerta scaduta invece di mandare il cliente su una pagina morta", async () => {
  const route = await read(
    "app/api/public/promotions/[id]/interest/route.ts",
  );
  const client = await read("app/richiesta/offer-interest-client.tsx");

  assert.match(route, /available: isAvailable/);
  assert.match(route, /promotion\.status === "TRASHED"/);
  assert.doesNotMatch(route, /Offerta non disponibile o scaduta\./);
  assert.match(client, /OFFERTA DA AGGIORNARE/);
  assert.match(
    client,
    /possiamo ricontattarti con l'aggiornamento o con alternative equivalenti/,
  );
  assert.match(client, /Completa ora la pratica/);
  assert.match(client, /completa=1/);
});

test("PR38 mantiene read-only il recupero offerta nella preview Render", async () => {
  const route = await read(
    "app/api/public/promotions/[id]/interest/route.ts",
  );
  const previewCheck = route.indexOf(
    "isRenderPullRequestPreview(request)",
  );
  const productionRead = route.indexOf(
    "const [promotion] = await getDb()",
  );

  assert.ok(previewCheck >= 0);
  assert.ok(productionRead > previewCheck);
  assert.match(route, /"4022223739"/);
  assert.match(route, /status: "EXPIRED"/);
  assert.match(route, /preview: true/);
});

test("PR38 usa il dominio ufficiale Noleggio per le future CTA Shopify", async () => {
  const shopify = await read("app/lib/server/shopify-safe-update.ts");

  assert.match(
    shopify,
    /https:\/\/noleggio\.eccomionline\.com\/richiesta/,
  );
  assert.doesNotMatch(
    shopify,
    /https:\/\/eccomi-noleggio\.onrender\.com\/richiesta/,
  );
});


test("PR38 rende lead-first anche le richieste da singola offerta", async () => {
  const page = await read("app/richiesta/page.tsx");
  const interest = await read("app/richiesta/offer-interest-client.tsx");

  assert.match(page, /OfferInterestClient/);
  assert.match(page, /params\.completa === "1"/);
  assert.match(page, /if \(!completePractice\)/);
  assert.match(interest, /PRIMA IL CONTATTO, POI LA PRATICA/);
  assert.match(interest, /Nessun IBAN e nessun/);
  assert.match(interest, /return \(\s*fields\.firstName/);
  assert.doesNotMatch(
    interest,
    /fields\.businessName\.trim\(\)\.length >= 2/,
  );
  assert.doesNotMatch(
    interest,
    /fields\.vatNumber\.replace\(\/\\D\/g, ""\)\.length === 11/,
  );
  assert.doesNotMatch(interest, /<span>Partita IVA<\/span>/);
  assert.match(interest, /source: "shopify-product"/);
});

test("PR38 recupera anche offerte scadute come interesse commerciale", async () => {
  const endpoint = await read(
    "app/api/public/promotions/[id]/interest/route.ts",
  );

  assert.match(endpoint, /available: false/);
  assert.match(endpoint, /status: "EXPIRED"/);
  assert.match(endpoint, /promotion\.status === "TRASHED"/);
  assert.doesNotMatch(
    endpoint,
    /!isAvailable\(promotion\.status, promotion\.validUntil\)/,
  );
});

test("PR38 usa il dominio ufficiale nei futuri CTA Shopify", async () => {
  const shopify = await read("app/lib/server/shopify-safe-update.ts");

  assert.match(
    shopify,
    /https:\/\/noleggio\.eccomionline\.com\/richiesta/,
  );
  assert.doesNotMatch(
    shopify,
    /https:\/\/eccomi-noleggio\.onrender\.com\/richiesta/,
  );
});


test("PR38 autorizza il dominio dinamico Render della preview senza aprirlo in produzione", async () => {
  const cors = await read("app/lib/server/public-origin.ts");

  assert.match(cors, /isRenderPullRequestPreview/);
  assert.match(cors, /origin\.endsWith\("\.onrender\.com"\)/);
  assert.match(cors, /origin\.includes\("-pr-"\)/);
  assert.match(cors, /isRenderPullRequestPreview\(request\)/);
});


test("PR38 accetta il POST same-origin dalla Render PR preview senza aprire il CORS", async () => {
  const cors = await read("app/lib/server/public-origin.ts");

  assert.match(cors, /isRenderPreviewHostname/);
  assert.match(cors, /requestOrigin === origin/);
  assert.match(cors, /forwardedOrigin === origin/);
  assert.match(cors, /isRenderPullRequestPreview\(request\)/);
  assert.doesNotMatch(cors, /origin\.endsWith\("\.onrender\.com"\)\s*\? origin/);
});


test("PR38 accetta la stessa preview Render anche quando il proxy espone requestUrl http", async () => {
  const origin = await read("app/lib/server/public-origin.ts");

  assert.match(origin, /sameHostBehindProxy/);
  assert.match(origin, /new URL\(origin\)\.host/);
  assert.match(origin, /new URL\(request\.url\)\.host/);
  assert.match(origin, /originHost === requestHost/);
});
