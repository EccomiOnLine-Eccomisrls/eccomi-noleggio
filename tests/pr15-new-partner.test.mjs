import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [network, formPage, createRoute, preview] = await Promise.all([
  read("app/ceo/partners/page.tsx"),
  read("app/ceo/partners/new/page.tsx"),
  read("app/api/ceo/partners/create/route.ts"),
  read("app/pr15-new-partner-demo/page.tsx"),
]);

test("PR15 espone Nuovo Partner dal CEO Control Center", () => {
  assert.match(network, /\/ceo\/partners\/new/);
  assert.match(network, /Nuovo Partner/);
  assert.match(formPage, /Crea Partner/);
  assert.match(formPage, /Invita Partner Admin/);
});

test("PR15 crea solo organizzazione Partner e lascia onboarding separato", () => {
  assert.match(createRoute, /db\.insert\(partners\)/);
  assert.match(createRoute, /PARTNER_CREATED/);
  assert.doesNotMatch(createRoute, /db\.insert\(users\)/);
  assert.match(createRoute, /contactEmail/);
  assert.match(createRoute, /legalName/);
});

test("PR15 protegge la scrittura e la preview non tocca produzione", () => {
  assert.match(createRoute, /requireCeo/);
  assert.match(createRoute, /sameOrigin/);
  assert.match(createRoute, /isRenderPullRequestPreview/);
  assert.match(preview, /SERVER-SAFE · ZERO JS/);
  assert.match(preview, /non crea Partner, utenti o dati in produzione/);
});
