import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("PR29 reassignment is CEO-only and preview-safe", async () => {
  const route = await read("app/api/ceo/promotions/[id]/reassign/route.ts");
  assert.match(route, /requireCeo\(request\)/);
  assert.match(route, /isRenderPullRequestPreview/);
  assert.match(route, /SIMULAZIONE PREVIEW: nessuna scrittura su Supabase o Shopify/);
});

test("PR29 moves only the promotion owner and never rewrites existing practices", async () => {
  const route = await read("app/api/ceo/promotions/[id]/reassign/route.ts");
  assert.match(route, /update\(promotions\)[\s\S]*partnerId: targetPartner\.id/);
  assert.doesNotMatch(route, /update\(leads\)/);
  assert.match(route, /existingPracticesReassigned: false/);
});

test("PR29 freezes legacy practices before resetting the old Partner Extra Gara", async () => {
  const route = await read("app/api/ceo/promotions/[id]/reassign/route.ts");
  const freezeAt = route.indexOf("tx.insert(commissionRules)");
  const resetAt = route.indexOf("tx\n        .delete(commissionRules)");
  assert.ok(freezeAt >= 0, "commission snapshot insert must exist");
  assert.ok(resetAt >= 0, "Partner increment reset must exist");
  assert.ok(freezeAt < resetAt, "existing practices must be frozen before Extra Gara is reset");
  assert.match(route, /scope: "LEAD"/);
  assert.match(route, /scope, "PARTNER_INCREMENT"/);
  assert.doesNotMatch(route, /delete\(commissionRules\)[\s\S]*scope, "PROMOTION"/);
});

test("PR29 keeps Base ECCOMI and Shopify untouched", async () => {
  const route = await read("app/api/ceo/promotions/[id]/reassign/route.ts");
  assert.match(route, /baseCommissionCents: baseCents/);
  assert.match(route, /partnerIncrementReset: true/);
  assert.match(route, /shopifyChanged: false/);
  assert.doesNotMatch(route, /shopifyGraphql|productUpdate|deleteProduct|setProductStatus/);
});

test("PR29 CEO UI exposes Partner and ECCOMI DIRETTO destinations", async () => {
  const page = await read("app/ceo/promotions/[id]/assignment/page.tsx");
  const editor = await read("app/ceo/promotions/[id]/page.tsx");
  assert.match(page, /Assegnazione offerta/);
  assert.match(page, /ECCOMI DIRETTO/);
  assert.match(page, /SIMULA RIASSEGNAZIONE/);
  assert.match(page, /CONFERMA RIASSEGNAZIONE/);
  assert.match(page, /L’Extra Gara del vecchio Partner viene azzerato/);
  assert.match(editor, /RIASSEGNA OFFERTA/);
  assert.match(editor, /\/assignment/);
});
