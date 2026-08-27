import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("expired or pending unpublished partner quotation stays under ECCOMI approval", async () => {
  const policy = await read("app/lib/server/partner-offer-policy.ts");
  assert.match(policy, /"PENDING_APPROVAL"/);
  assert.match(policy, /!input\.wasPublished/);
  assert.match(policy, /\["EXPIRED", "PENDING_APPROVAL"\]\.includes\(input\.currentStatus\)/);
  assert.match(policy, /return "PENDING_APPROVAL"/);
});

test("pending approval remains extendable by the owning partner", async () => {
  const policy = await read("app/lib/server/partner-offer-policy.ts");
  assert.match(policy, /extendableStatuses = new Set\(\[.*"PENDING_APPROVAL"/);
});

test("extension resumes Shopify preparation only for unpublished quotations without product", async () => {
  const route = await read("app/api/promotions/[id]/manage/route.ts");
  assert.match(route, /QUOTE_EXTEND_OWN/);
  assert.match(route, /promotion\.partnerId !== actor\.partnerId/);
  assert.match(route, /nextStatus === "PENDING_APPROVAL" && !promotion\.shopifyProductId && !promotion\.publishedAt/);
  assert.match(route, /await preparePromotionDraft\(\{ request, promotionId: id, actorEmail: actor\.email \}\)/);
  assert.match(route, /preparedAfterExtension = true/);
});

test("shared preparation creates a draft and keeps CEO approval required", async () => {
  const helper = await read("app/lib/server/promotion-preparation.ts");
  assert.match(helper, /createPromotionDraftOnShopify/);
  assert.match(helper, /automationStatus: "READY_FOR_CEO"/);
  assert.match(helper, /NOLEGGIO_PROMOTION_READY_FOR_CEO/);
  assert.doesNotMatch(helper, /status:\s*"ONLINE"/);
});

test("partner upload explains expired quotation instead of generic internal error", async () => {
  const route = await read("app/api/partner/offers/route.ts");
  assert.match(route, /promotion\.status === "EXPIRED"/);
  assert.match(route, /Quotazione registrata ma scaduta/);
  assert.match(route, /Aggiorna scadenza/);
  assert.match(route, /ECCOMI la rimetterà automaticamente in verifica/);
});

test("Render PR preview still refuses real writes", async () => {
  const createRoute = await read("app/api/partner/offers/route.ts");
  const manageRoute = await read("app/api/promotions/[id]/manage/route.ts");
  assert.match(createRoute, /isRenderPullRequestPreview/);
  assert.match(createRoute, /nessuna quotazione viene creata/);
  assert.match(manageRoute, /isRenderPullRequestPreview/);
  assert.match(manageRoute, /nessuna modifica a offerte o Shopify/);
});
