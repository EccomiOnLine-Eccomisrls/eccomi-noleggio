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
  assert.doesNotMatch(client, /\biban\s*:/i);
  assert.doesNotMatch(client, /fields\\.iban/i);
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
  assert.match(page, /<RequestClient[\s\S]*promotionId=\{promotionId\}/);

  const interestPosition = page.indexOf("<OfferInterestClient");
  const fullPracticePosition = page.indexOf("<RequestClient");

  assert.ok(interestPosition >= 0);
  assert.ok(fullPracticePosition > interestPosition);
});

test("PR38 cattura interesse da scheda senza IBAN o documenti e traccia solo un nuovo lead reale", async () => {
  const client = await read("app/richiesta/offer-interest-client.tsx");

  assert.doesNotMatch(client, /accountHolder/);
  assert.doesNotMatch(client, /\biban\s*:/i);
  assert.doesNotMatch(client, /fields\\.iban/i);
  assert.doesNotMatch(client, /document_identity|document_income|document_chamber/);
  assert.match(client, /source,/);
  assert.match(client, /response\.status === 201/);
  assert.match(client, /trackLeadCreated\(/);
  assert.match(client, /Nessun documento o IBAN richiesto ora\./);
});

test("PR38 recupera anche un'offerta scaduta invece di mandare il cliente su una pagina morta", async () => {
  const route = await read(
    "app/api/public/promotions/[id]/interest/route.ts",
  );
  const client = await read("app/richiesta/offer-interest-client.tsx");

  assert.match(route, /available: isAvailable/);
  assert.match(route, /interestVisibleStatuses/);
  assert.match(route, /"EXPIRED"/);
  assert.doesNotMatch(route, /Offerta non disponibile o scaduta\./);
  assert.match(client, /OFFERTA DA AGGIORNARE/);
  assert.match(
    client,
    /possiamo ricontattarti con l'aggiornamento o con alternative equivalenti/,
  );
  assert.match(client, /window\.location\.assign\(nextUrl\)/);
  assert.match(client, /completa=1/);
  assert.match(client, /L’offerta va aggiornata/);
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
  assert.match(interest, /source = "shopify-product"/);
});

test("PR38 recupera anche offerte scadute come interesse commerciale", async () => {
  const endpoint = await read(
    "app/api/public/promotions/[id]/interest/route.ts",
  );

  assert.match(endpoint, /available: false/);
  assert.match(endpoint, /status: "EXPIRED"/);
  assert.match(endpoint, /interestVisibleStatuses/);
  assert.match(endpoint, /"EXPIRED"/);
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


test("PR38 mostra esplicitamente il SAFE mode anche nella richiesta generica", async () => {
  const client = await read("app/richiesta/custom-request-client.tsx");

  assert.match(client, /const \[preview, setPreview\] = useState\(false\)/);
  assert.match(client, /preview\?: boolean/);
  assert.match(client, /setPreview\(payload\.preview === true\)/);
  assert.match(
    client,
    /Preview PR38: nessuna scrittura reale è stata[\s\S]*effettuata\./,
  );
});

test("PR38 espone un solo lead sintetico nella preview back-office senza dati reali", async () => {
  const fixture = await read("app/lib/server/preview-fixture.ts");

  assert.match(fixture, /ECR-PREVIEW-LEAD-000001/);
  assert.match(fixture, /preview\.lead@eccomi\.local/);
  assert.match(fixture, /documentStatus: "LEAD_RAPIDO"/);
  assert.match(fixture, /previewSynthetic: true/);
  assert.match(fixture, /ibanLast4: null/);
  assert.match(fixture, /accountHolder: null/);
  assert.match(fixture, /leads: 1/);
  assert.match(fixture, /newLeads: 1/);
});

test("PR38 abilita Lead e pratiche solo come vista QA della preview", async () => {
  const page = await read("app/page.tsx");
  const demo = await read("app/preview-demo.tsx");

  assert.match(page, /rawView === "leads" \? "leads"/);
  assert.match(page, /href="\/\?view=leads"/);
  assert.match(page, /QA SAFE/);

  assert.match(demo, /view: "dashboard" \| "promotions" \| "leads"/);
  assert.match(demo, /function LeadsView/);
  assert.match(demo, /Fixture sintetica · nessun dato reale/);
  assert.match(demo, /Non visibile ai Partner/);
  assert.match(demo, /Nessun IBAN · nessun documento/);
  assert.match(
    demo,
    /Questo record esiste solo nella preview PR38 e non viene scritto su Supabase\./,
  );
});


test("PR38 offre una promozione valida sintetica per il secondo step preview", async () => {
  const interest = await read(
    "app/api/public/promotions/[id]/interest/route.ts",
  );
  const promotion = await read(
    "app/api/public/promotions/[id]/route.ts",
  );

  assert.match(interest, /pr38-preview-valid-offer/);
  assert.match(interest, /offerNumber: "PR38-VALID-001"/);
  assert.match(interest, /status: "ONLINE"/);
  assert.match(interest, /available: true/);

  const previewGuard = promotion.indexOf(
    "isRenderPullRequestPreview(request)",
  );
  const productionDb = promotion.indexOf("const [row] = await getDb()");

  assert.ok(previewGuard >= 0);
  assert.ok(productionDb > previewGuard);
  assert.match(promotion, /pr38-preview-valid-offer/);
  assert.match(promotion, /imageUrl: "\/images\/hero-auto-su-misura\.jpeg"/);
  assert.match(promotion, /preview: true/);
});

test("PR38 practice start preview termina prima di DB e cifratura", async () => {
  const route = await read(
    "app/api/public/applications/start/route.ts",
  );

  const previewGuard = route.indexOf(
    "isRenderPullRequestPreview(request)",
  );
  const productionStart = route.indexOf("await Promise.all([");
  const encryption = route.indexOf(
    "await encryptSensitivePracticeData(iban)",
  );

  assert.ok(previewGuard >= 0);
  assert.ok(productionStart > previewGuard);
  assert.ok(encryption > previewGuard);
  assert.match(route, /ECN-PREVIEW-000001/);
  assert.match(route, /status: "UPLOAD_IN_PROGRESS"/);
  assert.match(route, /preview: true/);
});

test("PR38 document upload preview valida il file ma non usa DB o storage", async () => {
  const route = await read(
    "app/api/public/applications/[id]/document/route.ts",
  );

  const previewGuard = route.indexOf(
    "isRenderPullRequestPreview(request)",
  );
  const schemaWrite = route.indexOf("await ensurePracticeSchema()");
  const storageWrite = route.indexOf(
    "const stored = await uploadPracticeDocument",
  );

  assert.ok(previewGuard >= 0);
  assert.ok(schemaWrite > previewGuard);
  assert.ok(storageWrite > previewGuard);
  assert.match(route, /ECN-PREVIEW-000001/);
  assert.match(route, /ECD-PREVIEW-/);
  assert.match(route, /preview: true/);
});

test("PR38 completion preview termina prima di DB e audit reale", async () => {
  const route = await read(
    "app/api/public/applications/[id]/complete/route.ts",
  );

  const previewGuard = route.indexOf(
    "isRenderPullRequestPreview(request)",
  );
  const schemaWrite = route.indexOf("await ensurePracticeSchema()");
  const auditWrite = route.indexOf("await db.insert(auditLogs)");

  assert.ok(previewGuard >= 0);
  assert.ok(schemaWrite > previewGuard);
  assert.ok(auditWrite > previewGuard);
  assert.match(route, /ECN-PREVIEW-000001/);
  assert.match(route, /status: "NEW"/);
  assert.match(route, /preview: true/);
});

test("PR38 complete-practice preview resta completamente isolata", async () => {
  const client = await read("app/richiesta/request-client.tsx");
  const interest = await read("app/richiesta/offer-interest-client.tsx");
  const generic = await read("app/richiesta/custom-request-client.tsx");

  assert.match(client, /const \[preview, setPreview\] = useState\(false\)/);
  assert.match(client, /setPreview\(payload\.preview === true\)/);
  assert.match(
    client,
    /if \(!preview && !quickLeadCode\)[\s\S]*trackCompletedPracticeLead\(newPracticeCode\)/,
  );
  assert.match(client, /Nessuna scrittura DB/);
  assert.match(client, /nessun file su storage/);
  assert.match(client, /nessun evento Ads o audit reale/);

  assert.match(
    interest,
    /!preview[\s\S]*response\.status === 201[\s\S]*!conversionStarted\.current/,
  );
  assert.match(
    interest,
    /if \(offer\.available\)[\s\S]*window\.location\.assign\(nextUrl\)/,
  );

  assert.match(
    generic,
    /payload\.preview !== true[\s\S]*response\.status === 201/,
  );
});


test("PR38 preview non invia i byte dei documenti a Storage reale", async () => {
  const client = await read("app/richiesta/request-client.tsx");
  const prepare = await read(
    "app/api/public/applications/[id]/document-upload/prepare/route.ts",
  );

  assert.match(
    client,
    /if \(preparePayload\.preview\)[\s\S]*await finalize\(\)[\s\S]*return;/,
  );

  const previewBranch = client.indexOf(
    "if (preparePayload.preview)",
  );
  const signedUpload = client.indexOf(
    "preparePayload.signedUrl",
  );

  assert.ok(previewBranch >= 0);
  assert.ok(signedUpload > previewBranch);

  assert.match(
    prepare,
    /preview: true[\s\S]*signedUrl: null/,
  );
  assert.match(
    client,
    /Preview isolata: i file selezionati non vengono inviati a Storage reale/,
  );
});


test("PR38 hardening collega lead rapido e pratica senza duplicare la pipeline", async () => {
  const schema = await read("db/schema.ts");
  const migration = await read("app/lib/server/custom-request-schema.ts");
  const start = await read("app/api/public/applications/start/route.ts");
  const dashboard = await read("app/api/dashboard/route.ts");

  assert.match(schema, /promotionId: text\("promotion_id"\)/);
  assert.match(schema, /convertedPracticeId: text\("converted_practice_id"\)/);
  assert.match(schema, /convertedAt: text\("converted_at"\)/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS promotion_id text/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS converted_practice_id text/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS converted_at text/);

  assert.match(start, /quickLeadCode/);
  assert.match(start, /effectiveSubmissionKey/);
  assert.match(start, /quick:\$\{quickLeadCode\}/);
  assert.match(start, /status: "CONVERTED"/);
  assert.match(start, /convertedPracticeId: id/);
  assert.match(start, /db\.transaction/);

  assert.match(
    dashboard,
    /ne\(customVehicleRequests\.status, "CONVERTED"\)/,
  );
});

test("PR38 hardening emette una sola lead_created nel percorso lead-first", async () => {
  const interest = await read("app/richiesta/offer-interest-client.tsx");
  const complete = await read("app/richiesta/request-client.tsx");

  assert.match(interest, /trackLeadCreated\(/);
  assert.match(
    complete,
    /if \(!preview && !quickLeadCode\)[\s\S]*trackCompletedPracticeLead\(newPracticeCode\)/,
  );
  assert.match(complete, /quickLeadCode,/);
});

test("PR38 hardening preserva attribuzione Ads e Shopify fino alla pratica", async () => {
  const page = await read("app/richiesta/page.tsx");
  const interest = await read("app/richiesta/offer-interest-client.tsx");
  const custom = await read("app/api/public/custom-requests/route.ts");
  const start = await read("app/api/public/applications/start/route.ts");
  const shopify = await read("app/lib/server/shopify-safe-update.ts");

  assert.match(page, /source=\{source\}/);
  assert.match(page, /quickLeadCode=\{quickLeadCode\}/);
  assert.match(interest, /source = "shopify-product"/);
  assert.match(interest, /promotionId: offer\.id/);
  assert.match(interest, /source,/);

  assert.match(custom, /"openai-ads"/);
  assert.match(custom, /ECCOMI_NOLEGGIO_ADS/);
  assert.match(custom, /promotionId: promotionId \|\| null/);

  assert.match(start, /leadSource = quickLead\?\.source \|\| requestSource/);
  assert.match(start, /source: leadSource/);

  assert.match(shopify, /searchParams\.has\("source"\)/);
  assert.match(shopify, /searchParams\.set\("source", "shopify-product"\)/);
});

test("PR38 hardening usa KPI esatti e non la sola lista limitata", async () => {
  const dashboard = await read("app/api/dashboard/route.ts");

  assert.match(dashboard, /select\(\{ total: count\(\) \}\)/);
  assert.match(dashboard, /practiceLeadStats/);
  assert.match(dashboard, /quickLeadStats/);
  assert.match(dashboard, /newPracticeLeadStats/);
  assert.match(dashboard, /newQuickLeadStats/);
  assert.doesNotMatch(dashboard, /leads: dashboardLeads\.length/);
});

test("PR38 hardening non espone stati interni nell'interest pubblico", async () => {
  const interest = await read(
    "app/api/public/promotions/[id]/interest/route.ts",
  );

  assert.match(
    interest,
    /const interestVisibleStatuses = new Set\(\[[\s\S]*"ONLINE"[\s\S]*"ACTIVE"[\s\S]*"EXPIRING"[\s\S]*"EXPIRED"/,
  );
  assert.match(
    interest,
    /!interestVisibleStatuses\.has\(promotion\.status\)/,
  );
  assert.doesNotMatch(
    interest,
    /interestVisibleStatuses[\s\S]{0,120}"DRAFT"/,
  );
  assert.doesNotMatch(
    interest,
    /interestVisibleStatuses[\s\S]{0,160}"PENDING_APPROVAL"/,
  );
  assert.doesNotMatch(
    interest,
    /interestVisibleStatuses[\s\S]{0,160}"SUSPENDED"/,
  );
});

test("PR38 hardening precompila il secondo step senza mettere PII nella URL", async () => {
  const page = await read("app/richiesta/page.tsx");
  const interest = await read("app/richiesta/offer-interest-client.tsx");
  const complete = await read("app/richiesta/request-client.tsx");

  assert.match(page, /params\.lead/);
  assert.match(interest, /window\.sessionStorage\.setItem/);
  assert.match(interest, /quickLeadStorageKey\(payload\.requestCode\)/);
  assert.match(interest, /const nextUrl =/);
  assert.match(
    interest,
    /&completa=1&lead=\$\{encodeURIComponent\(payload\.requestCode\)\}/,
  );
  assert.match(
    interest,
    /&source=\$\{encodeURIComponent\(source\)\}/,
  );

  assert.match(complete, /window\.sessionStorage\.getItem/);
  assert.match(complete, /setProfile\(prefill\.customerType\)/);
  assert.match(complete, /setStep\(2\)/);
  assert.match(complete, /firstName: prefill\.firstName \|\| ""/);
  assert.match(complete, /email: prefill\.email \|\| ""/);
  assert.doesNotMatch(
    interest,
    /completa=1[^\n]*firstName=/,
  );
});


test("PR38 UX continuity non mostra la conferma intermedia sulle offerte valide", async () => {
  const interest = await read("app/richiesta/offer-interest-client.tsx");

  const redirectPosition = interest.indexOf("if (offer.available)");
  const requestCodePosition = interest.indexOf(
    "setRequestCode(payload.requestCode)",
  );

  assert.ok(redirectPosition >= 0);
  assert.ok(requestCodePosition > redirectPosition);
  assert.match(
    interest,
    /if \(offer\.available\)[\s\S]*window\.location\.assign\(nextUrl\)[\s\S]*return;/,
  );
  assert.match(interest, /Continua alla pratica/);
  assert.doesNotMatch(interest, /Completa ora la pratica/);
  assert.match(
    interest,
    /L’offerta va aggiornata: ti proporremo la[\s\S]*versione valida o alternative equivalenti/,
  );
});

test("PR38 UX continuity preserva una sola conversione durante il redirect", async () => {
  const interest = await read("app/richiesta/offer-interest-client.tsx");
  const complete = await read("app/richiesta/request-client.tsx");

  assert.match(interest, /quickLeadConversionKey/);
  assert.match(
    interest,
    /conversionSent \? "sent" : "pending"/,
  );
  assert.match(
    complete,
    /conversionState !== "pending"/,
  );
  assert.match(
    complete,
    /trackOpenAiLeadCreated\([\s\S]*quickLeadConversionKey\(quickLeadCode\)[\s\S]*"sent"/,
  );
});
