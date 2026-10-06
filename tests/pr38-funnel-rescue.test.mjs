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
