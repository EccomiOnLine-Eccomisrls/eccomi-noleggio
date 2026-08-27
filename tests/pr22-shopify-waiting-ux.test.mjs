import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("PR22 mounts waiting UX only around promotion detail routes", async () => {
  const layout = await read("app/ceo/promotions/[id]/layout.tsx");
  assert.match(layout, /ShopifyPreparationWaiting/);
});

test("waiting UX intercepts only prepare-form submission", async () => {
  const component = await read("app/ceo/promotions/[id]/shopify-preparation-waiting.tsx");
  assert.match(component, /button\[formaction\*="\/prepare-form"\]/);
  assert.match(component, /form\.requestSubmit\(button\)/);
  assert.match(component, /Sto preparando la bozza/);
  assert.match(component, /Non chiudere questa pagina/);
});

test("dedicated PR22 preview route exists", async () => {
  const page = await read("app/ceo/promotions/preview-pr22-waiting/page.tsx");
  assert.match(page, /PREVIEW SICURA/);
  assert.match(page, /SIMULA PREPARA BOZZA SHOPIFY/);
});

test("PR22 preview simulates a realistic wait without external writes", async () => {
  const route = await read("app/api/promotions/preview-pr22-waiting/prepare-form/route.ts");
  assert.match(route, /isRenderPullRequestPreview/);
  assert.match(route, /10_500/);
  assert.match(route, /prepared/);
  assert.doesNotMatch(route, /Supabase|Shopify|preparePromotionDraft/);
});
