import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("PR30 is CEO-only and preview-safe", async () => {
  const source = await read("app/api/ceo/partners/[id]/delete/route.ts");
  assert.match(source, /requireCeo\(request\)/);
  assert.match(source, /isRenderPullRequestPreview/);
  assert.match(source, /confirmation !== "ELIMINA"/);
});

test("PR30 checks every partner relation before removal", async () => {
  const source = await read("app/lib/server/partner-delete-policy.ts");
  assert.match(source, /offers: offerRows\.length/);
  assert.match(source, /practices: practiceRows\.length/);
  assert.match(source, /users: userRows\.length/);
  assert.match(source, /commissions: commissionRows\.length/);
  assert.match(source, /canDelete: !internalEccomi && !hasLinks/);
});

test("PR30 protects ECCOMI DIRETTO", async () => {
  const source = await read("app/lib/server/partner-delete-policy.ts");
  assert.match(source, /id === "eccomi-direct"/);
});

test("PR30 UI exposes verification before destructive action", async () => {
  const list = await read("app/ceo/partners/page.tsx");
  const page = await read("app/ceo/partners/[id]/delete/page.tsx");
  assert.match(list, /Elimina \/ verifica/);
  assert.match(page, /ELIMINAZIONE BLOCCATA/);
  assert.match(page, /PARTNER ELIMINABILE/);
  assert.match(page, /Scrivi ELIMINA per confermare/);
});
