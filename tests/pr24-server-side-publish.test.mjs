import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const listPage = await readFile(new URL("../app/ceo/promotions/page.tsx", import.meta.url), "utf8");
const publishPage = await readFile(new URL("../app/ceo/promotions/[id]/publish/page.tsx", import.meta.url), "utf8");
const publishForm = await readFile(new URL("../app/api/promotions/[id]/publish-form/route.ts", import.meta.url), "utf8");

test("server-side promotions list exposes publish only for prepared pending/approved offers", () => {
  assert.match(listPage, /shopifyProductId/);
  assert.match(listPage, /PENDING_APPROVAL/);
  assert.match(listPage, /APPROVED/);
  assert.match(listPage, /🚀 Pubblica online/);
  assert.match(listPage, /\/publish/);
});

test("server-side publish page requires explicit confirmation", () => {
  assert.match(publishPage, /Conferma pubblicazione/);
  assert.match(publishPage, /CONFERMA PUBBLICAZIONE ONLINE/);
  assert.match(publishPage, /publish-form/);
  assert.match(publishPage, /PRODOTTO SHOPIFY COLLEGATO/);
});

test("PR preview never calls the real publish endpoint", () => {
  const previewIndex = publishForm.indexOf("isRenderPullRequestPreview");
  const publishIndex = publishForm.indexOf("publishPromotion(request");
  assert.ok(previewIndex >= 0);
  assert.ok(publishIndex > previewIndex);
  assert.match(publishForm, /published.*preview/s);
});
