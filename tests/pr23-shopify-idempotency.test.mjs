import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(
  new URL("../app/lib/server/promotion-preparation.ts", import.meta.url),
  "utf8",
);

test("PR23 claims promotion before creating Shopify draft", () => {
  const claim = source.indexOf("acquirePreparationClaim(promotion)");
  const create = source.indexOf("createPromotionDraftOnShopify({");
  assert.ok(claim >= 0, "atomic preparation claim must exist");
  assert.ok(create > claim, "Shopify create must happen only after the claim");
  assert.match(source, /automationStatus:\s*"PROCESSING"/);
  assert.match(source, /\.returning\(\{ id: promotions\.id \}\)/);
});

test("PR23 waits for concurrent preparation instead of creating duplicates", () => {
  assert.match(source, /waitForConcurrentPreparation/);
  assert.match(source, /if \(!claimed\) return waitForConcurrentPreparation\(promotionId\)/);
  assert.match(source, /current\.shopifyProductId/);
});

test("PR23 recovers an existing Shopify draft before creating a new one", () => {
  const recovery = source.indexOf("findExistingPromotionDraftOnShopify(");
  const create = source.indexOf("createPromotionDraftOnShopify({");
  assert.ok(recovery >= 0, "Shopify recovery lookup must exist");
  assert.ok(create > recovery, "existing draft lookup must precede product creation");
  assert.match(source, /metafield\(namespace: "eccomi_noleggio", key: "promotion_id"\)/);
  assert.match(source, /PROMOTION_DRAFT_REUSED_SHOPIFY/);
});

test("PR23 keeps already linked promotions idempotent", () => {
  assert.match(source, /if \(promotion\.shopifyProductId\)/);
  assert.match(source, /alreadyPrepared:\s*true/);
});
