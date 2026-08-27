import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("PR27 keeps ECCOMI base and Partner increment separate", async () => {
  const service = await read("app/lib/server/commission-service.ts");
  assert.match(service, /"PARTNER_INCREMENT"/);
  assert.match(service, /getPromotionEccomiCommission/);
  assert.match(service, /getPartnerPromotionCommissionIncrement/);
  assert.match(service, /totalCents: baseCents \+ partnerIncrementCents/);
});

test("new practices snapshot base plus Partner increment", async () => {
  const schema = await read("app/lib/server/practice-schema.ts");
  assert.match(schema, /base_rule\.amount_cents \+ COALESCE\(partner_extra\.amount_cents, 0\)/);
  assert.match(schema, /partner_extra\.scope = 'PARTNER_INCREMENT'/);
  assert.match(schema, /'LEAD:' \|\| NEW\.id/);
});

test("Partner route is company-scoped and only Partner Admin may increase", async () => {
  const route = await read("app/api/partner/offers/[id]/commission-increase/route.ts");
  assert.match(route, /isPartnerNoleggioRole/);
  assert.match(route, /actor\.role !== "PARTNER_ADMIN"/);
  assert.match(route, /promotion\.partnerId !== actor\.partnerId/);
  assert.match(route, /requestedTotalCents <= current\.totalCents/);
  assert.match(route, /Puoi solo aumentare la provvigione/);
  assert.match(route, /PARTNER_ECCOMI_COMMISSION_INCREASE/);
});

test("Partner increase never rewrites already frozen lead snapshots", async () => {
  const route = await read("app/api/partner/offers/[id]/commission-increase/route.ts");
  assert.doesNotMatch(route, /setTerm\("LEAD"/);
  assert.doesNotMatch(route, /update\(leads\)/);
});

test("PR27 preview exposes allowed increase and blocked reduction", async () => {
  const page = await read("app/partner/provvigioni/page.tsx");
  assert.match(page, /500 € → 650 €/);
  assert.match(page, /CONSENTITO/);
  assert.match(page, /650 € → 450 €/);
  assert.match(page, /BLOCCATO/);
  assert.match(page, /La provvigione può solo aumentare, mai diminuire/);
});

test("real writes are disabled in Render PR previews", async () => {
  const route = await read("app/api/partner/offers/[id]/commission-increase/route.ts");
  assert.match(route, /isRenderPullRequestPreview/);
  assert.match(route, /nessuna provvigione reale può essere modificata/);
});
