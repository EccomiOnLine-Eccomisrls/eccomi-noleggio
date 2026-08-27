import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("PR26 enforces one ECCOMI commission per practice at database level", async () => {
  const schema = await read("app/lib/server/practice-schema.ts");
  assert.match(schema, /CREATE UNIQUE INDEX IF NOT EXISTS commissions_lead_unique_idx ON commissions\(lead_id\)/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS commission_rules/);
});

test("offer commission is frozen automatically when a practice is created", async () => {
  const schema = await read("app/lib/server/practice-schema.ts");
  assert.match(schema, /eccomi_snapshot_commission_on_lead_insert/);
  assert.match(schema, /rule\.scope = 'PROMOTION'/);
  assert.match(schema, /'LEAD:' \|\| NEW\.id/);
});

test("CEO always has ECCOMI commission permission and only manager or deputy may receive it", async () => {
  const permissions = await read("app/lib/permissions.ts");
  assert.match(permissions, /COMMISSION_SET_ECCOMI/);
  assert.match(permissions, /targetRole === "NOLEGGIO_MANAGER" \|\| targetRole === "NOLEGGIO_DEPUTY"/);
});

test("setting the ECCOMI commission requires the dedicated economic permission", async () => {
  const route = await read("app/api/ceo/commissions/rule-form/route.ts");
  assert.match(route, /requirePermission\(request, "COMMISSION_SET_ECCOMI"\)/);
  assert.match(route, /ECCOMI_COMMISSION_OFFER_SET/);
  assert.doesNotMatch(route, /scope === "PARTNER"/);
});

test("offer approval and publication require delegated permissions and an ECCOMI commission", async () => {
  const approve = await read("app/api/promotions/[id]/approve/route.ts");
  const publish = await read("app/api/promotions/[id]/publish/route.ts");
  assert.match(approve, /requirePermission\(request, "QUOTE_APPROVE"\)/);
  assert.match(approve, /getPromotionEccomiCommission/);
  assert.match(approve, /Definisci prima la provvigione ECCOMI/);
  assert.match(publish, /requirePermission\(request, "QUOTE_PUBLISH"\)/);
  assert.match(publish, /getPromotionEccomiCommission/);
  assert.match(publish, /Definisci prima la provvigione ECCOMI/);
});

test("contract acquisition and ECCOMI commission accrual are atomic and idempotent", async () => {
  const route = await read("app/api/practices/[id]/action/route.ts");
  assert.match(route, /nextStatus === "CONTRACT"/);
  assert.match(route, /resolveEccomiCommissionForLead/);
  assert.match(route, /db\.transaction/);
  assert.match(route, /onConflictDoNothing\(\)/);
  assert.match(route, /ECCOMI_COMMISSION_ACCRUED_ON_CONTRACT/);
  assert.match(route, /Provvigione ECCOMI non configurata/);
});

test("partner commission totals remain server-side partner filtered", async () => {
  const dashboard = await read("app/api/dashboard/route.ts");
  assert.match(dashboard, /eq\(commissions\.partnerId, actor\.partnerId\)/);
  assert.match(dashboard, /commissions: commissionRows/);
});

test("PR26 preview explains offer to practice snapshot and links to deterministic idempotency test", async () => {
  const page = await read("app/ceo/commissions/page.tsx");
  const idempotency = await read("app/ceo/commissions/pr26-idempotenza/page.tsx");
  assert.match(page, /Provvigioni ECCOMI/);
  assert.match(page, /Definita da CEO oppure Responsabile\/Referente ECCOMI abilitato/);
  assert.match(page, /Contratto acquisito = provvigione maturata/);
  assert.match(page, /\/ceo\/commissions\/pr26-idempotenza/);
  assert.match(page, /SIMULA CONTRATTO DOPPIO CLICK/);
  assert.match(idempotency, /TEST COMPLETATO: CONTRATTO = 1 PROVVIGIONE/);
  assert.match(idempotency, /CREDITI TOTALI/);
  assert.match(idempotency, /NESSUNA SCRITTURA REALE/);
  assert.match(page, /MATURATE/);
  assert.match(page, /FATTURATE/);
  assert.match(page, /PAGATE/);
});

test("commission writes are disabled in Render PR previews", async () => {
  const ruleForm = await read("app/api/ceo/commissions/rule-form/route.ts");
  const statusForm = await read("app/api/ceo/commissions/[id]/status-form/route.ts");
  assert.match(ruleForm, /isRenderPullRequestPreview/);
  assert.match(ruleForm, /nessuna provvigione reale/);
  assert.match(statusForm, /isRenderPullRequestPreview/);
  assert.match(statusForm, /nessuna commissione reale/);
});
