import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const read = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

async function loadAttribution() {
  const source = await read("app/lib/attribution.ts");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;

  return import(
    `data:text/javascript;base64,${Buffer.from(
      transpiled,
      "utf8",
    ).toString("base64")}`
  );
}

test("PR41 normalizza attribuzione generica senza dipendere da OpenAI Ads", async () => {
  const { normalizeAttribution } = await loadAttribution();

  assert.deepEqual(
    normalizeAttribution(
      {
        source: "Meta-Ads",
        entry: "Shopify-Product",
        campaign: "autunno-2026",
        adGroup: "retargeting-roma",
        ad: "creative-03",
      },
      "direct",
      "direct",
    ),
    {
      attributionSource: "meta-ads",
      entrySource: "shopify-product",
      campaignKey: "autunno-2026",
      adGroupKey: "retargeting-roma",
      adKey: "creative-03",
    },
  );
});

test("PR41 mantiene compatibilità con le sorgenti legacy ECCOMI", async () => {
  const { legacyRequestSource } = await loadAttribution();

  assert.equal(
    legacyRequestSource(
      "openai-ads",
      "ECCOMI_NOLEGGIO_WEB",
    ),
    "ECCOMI_NOLEGGIO_ADS",
  );
  assert.equal(
    legacyRequestSource(
      "shopify-product",
      "ECCOMI_NOLEGGIO_WEB",
    ),
    "ECCOMI_NOLEGGIO_SHOPIFY_PRODUCT",
  );
  assert.equal(
    legacyRequestSource(
      "meta-ads",
      "ECCOMI_NOLEGGIO_WEB",
    ),
    "ECCOMI_NOLEGGIO_WEB",
  );
});

test("PR41 rifiuta token di attribuzione non sicuri", async () => {
  const { attributionToken } = await loadAttribution();

  assert.equal(attributionToken(" OpenAI-Ads "), "openai-ads");
  assert.equal(attributionToken("meta ads"), "");
  assert.equal(attributionToken("<script>"), "");
  assert.equal(attributionToken("utm_source=evil"), "");
});

test("PR41 aggiunge i campi di attribuzione a lead rapido e pratica", async () => {
  const schema = await read("db/schema.ts");
  const customSchema = await read(
    "app/lib/server/custom-request-schema.ts",
  );
  const practiceSchema = await read(
    "app/lib/server/practice-schema.ts",
  );

  for (const field of [
    "attribution_source",
    "entry_source",
    "campaign_key",
    "ad_group_key",
    "ad_key",
  ]) {
    assert.match(schema, new RegExp(field));
    assert.match(customSchema, new RegExp(field));
    assert.match(practiceSchema, new RegExp(field));
  }
});

test("PR41 porta source entry campaign ad_group e ad dalla URL fino al quick lead", async () => {
  const page = await read("app/richiesta/page.tsx");
  const interest = await read(
    "app/richiesta/offer-interest-client.tsx",
  );
  const custom = await read(
    "app/richiesta/custom-request-client.tsx",
  );
  const api = await read(
    "app/api/public/custom-requests/route.ts",
  );

  assert.match(page, /params\.source/);
  assert.match(page, /params\.entry/);
  assert.match(page, /params\.campaign/);
  assert.match(page, /params\.ad_group/);
  assert.match(page, /params\.ad/);

  assert.match(interest, /entry,/);
  assert.match(interest, /campaign,/);
  assert.match(interest, /adGroup,/);
  assert.match(interest, /ad,/);
  assert.match(interest, /nextParams\.set\("entry"/);
  assert.match(interest, /nextParams\.set\("campaign"/);
  assert.match(interest, /nextParams\.set\("ad_group"/);
  assert.match(interest, /nextParams\.set\("ad"/);

  assert.match(custom, /entry,/);
  assert.match(custom, /campaign,/);
  assert.match(custom, /adGroup,/);
  assert.match(custom, /ad,/);

  assert.match(api, /normalizeAttribution/);
  assert.match(api, /attributionSource: attribution\.attributionSource/);
  assert.match(api, /entrySource: attribution\.entrySource/);
  assert.match(api, /campaignKey: attribution\.campaignKey/);
  assert.match(api, /adGroupKey: attribution\.adGroupKey/);
  assert.match(api, /adKey: attribution\.adKey/);
});

test("PR41 congela l'attribuzione del quick lead quando nasce la pratica", async () => {
  const start = await read(
    "app/api/public/applications/start/route.ts",
  );

  assert.match(
    start,
    /attributionSource: customVehicleRequests\.attributionSource/,
  );
  assert.match(
    start,
    /entrySource: customVehicleRequests\.entrySource/,
  );
  assert.match(start, /campaignKey: customVehicleRequests\.campaignKey/);
  assert.match(start, /adGroupKey: customVehicleRequests\.adGroupKey/);
  assert.match(start, /adKey: customVehicleRequests\.adKey/);

  assert.match(
    start,
    /quickLead\?\.attributionSource[\s\S]*requestAttribution\.attributionSource/,
  );
  assert.match(
    start,
    /quickLead\?\.entrySource[\s\S]*requestAttribution\.entrySource/,
  );
  assert.match(start, /attributionSource: leadAttribution\.attributionSource/);
  assert.match(start, /entrySource: leadAttribution\.entrySource/);
  assert.match(start, /campaignKey: leadAttribution\.campaignKey/);
  assert.match(start, /adGroupKey: leadAttribution\.adGroupKey/);
  assert.match(start, /adKey: leadAttribution\.adKey/);
});

test("PR41 espone attribuzione nel cruscotto CEO", async () => {
  const route = await read("app/api/dashboard/route.ts");
  const client = await read("app/dashboard-client.tsx");

  assert.match(route, /attributionSource: leads\.attributionSource/);
  assert.match(route, /entrySource: leads\.entrySource/);
  assert.match(route, /campaignKey: leads\.campaignKey/);
  assert.match(route, /adGroupKey: leads\.adGroupKey/);
  assert.match(route, /adKey: leads\.adKey/);

  assert.match(client, /Origine \{attributionLabel\(lead\.attributionSource\)\}/);
  assert.match(client, /ingresso \{attributionLabel\(lead\.entrySource\)\}/);
  assert.match(client, /Campagna \{lead\.campaignKey\}/);
});

test("PR41 non rende l'attribuzione una dipendenza funzionale del funnel", async () => {
  const page = await read("app/richiesta/page.tsx");
  const helper = await read("app/lib/attribution.ts");

  assert.match(page, /"shopify-product" : "direct"/);
  assert.match(helper, /fallbackSource = "direct"/);
  assert.match(helper, /fallbackEntry = "direct"/);
  assert.doesNotMatch(helper, /oaiq|pixelId|GiUebj6gpbj7aEBW9JfgZ8/);
});

test("PR41 mantiene la preview Render prima di ogni scrittura reale", async () => {
  const custom = await read(
    "app/api/public/custom-requests/route.ts",
  );
  const start = await read(
    "app/api/public/applications/start/route.ts",
  );

  assert.ok(
    custom.indexOf("isRenderPullRequestPreview(request)")
    < custom.indexOf("await ensureCustomRequestSchema()"),
  );
  assert.ok(
    start.indexOf("isRenderPullRequestPreview(request)")
    < start.indexOf("await Promise.all(["),
  );
});
