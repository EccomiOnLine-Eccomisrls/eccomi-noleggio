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

test("PR28 keeps the Partner-facing Extra Gara page minimal", async () => {
  const page = await read("app/partner/provvigioni/page.tsx");
  assert.match(page, /<h1>Extra Gara<\/h1>/);
  assert.match(page, /Aumenta il compenso riconosciuto su una singola offerta\./);
  assert.match(page, /<h2>Le tue offerte<\/h2>/);
  assert.doesNotMatch(page, /BASE ECCOMI<\/small><strong>PROTETTA/);
  assert.doesNotMatch(page, /PRATICHE ESISTENTI/);
  assert.doesNotMatch(page, /COLLAUDO PR28/);
  assert.doesNotMatch(page, /ANTI-RIBASSO/);
});

test("PR28 shows four clean columns and opens Extra Gara from the offer row", async () => {
  const table = await read("app/partner/provvigioni/extra-gara-offers.tsx");
  assert.match(table, /<th>Offerta<\/th>/);
  assert.match(table, /<th>Base ECCOMI<\/th>/);
  assert.match(table, /<th>Extra Gara<\/th>/);
  assert.match(table, /<th>Totale<\/th>/);
  assert.doesNotMatch(table, /<th>Aumenta imponibile a<\/th>/);
  assert.match(table, /onClick=\{\(\) => setSelected\(offer\)\}/);
  assert.match(table, /Nuovo totale imponibile/);
  assert.match(table, /Conferma Extra Gara/);
  assert.match(table, /commission-increase/);
  assert.doesNotMatch(table, /placeholder=\{`Più di/);
});

test("PR28 keeps the by Eccomi OnLine signature across Partner views", async () => {
  const polish = await read("app/partner/partner-portal-polish.module.css");
  const extraGara = await read("app/partner/provvigioni/extra-gara-offers.tsx");
  const preview = await read("app/partner/pr28-workspace-preview/page.tsx");
  assert.match(polish, /by Eccomi OnLine/);
  assert.match(polish, /AREA PARTNER/);
  assert.match(extraGara, /by Eccomi OnLine/);
  assert.match(extraGara, /AREA PARTNER/);
  assert.match(preview, /ECCOMI NOLEGGIO/);
  assert.match(preview, /by Eccomi OnLine/);
  assert.match(preview, /AREA PARTNER/);
});
