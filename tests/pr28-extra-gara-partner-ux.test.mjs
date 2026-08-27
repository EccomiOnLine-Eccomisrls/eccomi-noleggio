import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("PR28 removes the floating commission shortcut", async () => {
  const page = await read("app/partner/page.tsx");
  assert.doesNotMatch(page, /Provvigioni offerte/);
  assert.doesNotMatch(page, /position:\s*"fixed"/);
});

test("PR28 integrates Extra Gara between Commissioni and Collaboratori", async () => {
  const client = await read("app/partner/partner-portal-client.tsx");
  const commissions = client.indexOf('label: "Commissioni"');
  const extra = client.indexOf('>Extra Gara<');
  const collaborators = client.indexOf('>Collaboratori<');
  assert.ok(commissions >= 0);
  assert.ok(extra > commissions);
  assert.ok(collaborators > extra);
  assert.match(client, /href="\/partner\/provvigioni"/);
});

test("PR28 clarifies commissions owed by the Partner", async () => {
  const client = await read("app/partner/partner-portal-client.tsx");
  assert.match(client, /Provvigioni dovute/);
  assert.match(client, /PROVVIGIONI DOVUTE/);
  assert.match(client, /CONTRATTO ACQUISITO/);
  assert.match(client, /La provvigione ECCOMI matura quando il contratto viene acquisito\./);
  assert.doesNotMatch(client, /LE TUE COMMISSIONI/);
  assert.doesNotMatch(client, /matura alla consegna/);
});

test("PR28 Extra Gara uses the authenticated Partner name", async () => {
  const page = await read("app/partner/provvigioni/page.tsx");
  assert.match(page, /partners, promotions/);
  assert.match(page, /where\(eq\(partners\.id, actor\.partnerId\)\)/);
  assert.match(page, /partnerName = partner\?\.name/);
  assert.match(page, /<h1>Extra Gara<\/h1>/);
  assert.match(page, /PR28 · PREVIEW SICURA · NESSUNA SCRITTURA REALE/);
});
