import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("partner offer management is restricted to own partner_id", async () => {
  const source = await read("app/api/promotions/[id]/manage/route.ts");
  assert.match(source, /promotion\.partnerId !== actor\.partnerId/);
  assert.match(source, /QUOTE_SUSPEND_OWN/);
  assert.match(source, /QUOTE_ARCHIVE_OWN/);
  assert.match(source, /QUOTE_EXTEND_OWN/);
  assert.match(source, /Azione riservata a ECCOMI/);
});

test("partner cannot publish or approve from offer workspace", async () => {
  const source = await read("app/partner/partner-portal-client.tsx");
  assert.doesNotMatch(source, /Pubblica offerta/);
  assert.doesNotMatch(source, /Approva offerta/);
  assert.match(source, /Invia a verifica ECCOMI/);
  assert.match(source, /IN VERIFICA ECCOMI/);
});

test("partner workspace exposes real create, suspend, archive and expiry actions", async () => {
  const source = await read("app/partner/partner-portal-client.tsx");
  assert.match(source, /\/api\/partner\/offers/);
  assert.match(source, /manageOffer\(item, "SUSPEND"\)/);
  assert.match(source, /manageOffer\(item, "ARCHIVE"\)/);
  assert.match(source, /manageOffer\(item, "EXTEND"\)/);
});

test("pull request preview refuses real partner offer writes", async () => {
  const createRoute = await read("app/api/partner/offers/route.ts");
  const manageRoute = await read("app/api/promotions/[id]/manage/route.ts");
  assert.match(createRoute, /isRenderPullRequestPreview/);
  assert.match(createRoute, /Shopify non viene contattato/);
  assert.match(manageRoute, /isRenderPullRequestPreview/);
  assert.match(manageRoute, /nessuna modifica a offerte o Shopify/);
});

test("suspended status remains a first-class commercial state", async () => {
  const service = await read("app/lib/server/promotion-service.ts");
  const policy = await read("app/lib/server/partner-offer-policy.ts");
  assert.match(service, /"SUSPENDED"/);
  assert.match(service, /SUSPENDED: "SOSPESA"/);
  assert.match(policy, /currentStatus === "SUSPENDED"/);
  assert.match(policy, /return "SUSPENDED"/);
});
