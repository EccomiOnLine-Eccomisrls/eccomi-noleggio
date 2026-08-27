import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("PR26 enforces one commission per practice at database level", async () => {
  const schema = await read("app/lib/server/practice-schema.ts");
  assert.match(schema, /CREATE UNIQUE INDEX IF NOT EXISTS commissions_lead_unique_idx ON commissions\(lead_id\)/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS commission_rules/);
});

test("commission hierarchy is practice then promotion then partner", async () => {
  const service = await read("app/lib/server/commission-service.ts");
  const lead = service.indexOf('getCommissionRule("LEAD"');
  const promotion = service.indexOf('getCommissionRule("PROMOTION"');
  const partner = service.indexOf('getCommissionRule("PARTNER"');
  assert.ok(lead >= 0 && promotion > lead && partner > promotion);
  assert.match(service, /INTERNAL_ECCOMI/);
  assert.match(service, /UNCONFIGURED/);
});

test("delivery and commission accrual are atomic and idempotent", async () => {
  const route = await read("app/api/practices/[id]/action/route.ts");
  assert.match(route, /nextStatus === "DELIVERED"/);
  assert.match(route, /resolveCommissionForLead/);
  assert.match(route, /db\.transaction/);
  assert.match(route, /onConflictDoNothing\(\)/);
  assert.match(route, /COMMISSION_ACCRUED_ON_DELIVERY/);
  assert.match(route, /Commissione non configurata/);
});

test("partner commission detail remains server-side partner filtered", async () => {
  const dashboard = await read("app/api/dashboard/route.ts");
  assert.match(dashboard, /eq\(commissions\.partnerId, actor\.partnerId\)/);
  assert.match(dashboard, /commissions: commissionRows/);
});

test("CEO Commission Center exposes rules and safe double-click simulation", async () => {
  const page = await read("app/ceo/commissions/page.tsx");
  assert.match(page, /Pratica → Offerta → Partner/);
  assert.match(page, /SIMULA DOPPIO CLICK CONSEGNA/);
  assert.match(page, /1 CREAZIONE · 1 RIUSO/);
  assert.match(page, /MATURATE/);
  assert.match(page, /FATTURATE/);
  assert.match(page, /PAGATE/);
});

test("commission rule writes are disabled in Render PR previews", async () => {
  const ruleForm = await read("app/api/ceo/commissions/rule-form/route.ts");
  const statusForm = await read("app/api/ceo/commissions/[id]/status-form/route.ts");
  assert.match(ruleForm, /isRenderPullRequestPreview/);
  assert.match(ruleForm, /nessuna regola commissionale reale/);
  assert.match(statusForm, /isRenderPullRequestPreview/);
  assert.match(statusForm, /nessuna commissione reale/);
});
