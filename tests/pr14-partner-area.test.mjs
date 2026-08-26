import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [partnerPage, partnerAuthz, partnerSession, dashboard, promotionService, promotionsRoute, practiceRoute, documentRoute, actionRoute, coverRoute, quoteRoute, preview] = await Promise.all([
  read("app/partner/page.tsx"),
  read("app/lib/server/partner-authz.ts"),
  read("app/api/partner/session/route.ts"),
  read("app/api/dashboard/route.ts"),
  read("app/lib/server/promotion-service.ts"),
  read("app/api/promotions/route.ts"),
  read("app/api/practices/[id]/route.ts"),
  read("app/api/practices/[id]/documents/[documentId]/route.ts"),
  read("app/api/practices/[id]/action/route.ts"),
  read("app/api/promotions/[id]/cover/route.ts"),
  read("app/api/promotions/[id]/quote/route.ts"),
  read("app/pr14-partner-area-demo/page.tsx"),
]);

test("PR14 separa la sessione CEO dall'Area Partner", () => {
  assert.match(partnerPage, /\/api\/partner\/session/);
  assert.match(partnerPage, /Il login CEO non abilita questa area/);
  assert.match(partnerAuthz, /isPartnerNoleggioRole\(actor\.role\)/);
  assert.match(partnerAuthz, /Area riservata agli account Partner/);
  assert.match(partnerSession, /requirePartnerActor/);
});

test("PR14 tratta PARTNER e PARTNER_ADMIN come ruoli Partner in ogni scope dati critico", () => {
  assert.match(dashboard, /isPartnerNoleggioRole\(actor\.role\).*leads\.partnerId/s);
  assert.match(dashboard, /isPartnerNoleggioRole\(actor\.role\).*commissions\.partnerId/s);
  assert.match(promotionService, /isPartnerNoleggioRole\(actor\.role\).*promotions\.partnerId/s);
  assert.match(promotionsRoute, /const partnerId = isPartnerNoleggioRole\(actor\.role\)/);
  assert.match(practiceRoute, /isPartnerNoleggioRole\(actor\.role\).*practice\.lead\.partnerId/s);
  assert.match(documentRoute, /isPartnerNoleggioRole\(actor\.role\).*document\.partnerId/s);
  assert.match(actionRoute, /isPartnerNoleggioRole\(actor\.role\).*practice\.partnerId/s);
  assert.match(actionRoute, /isPartnerNoleggioRole\(actor\.role\).*partnerAllowedStatuses/s);
  assert.match(coverRoute, /isPartnerNoleggioRole\(actor\.role\).*promotion\.partnerId/s);
  assert.match(quoteRoute, /isPartnerNoleggioRole\(actor\.role\).*promotion\.partnerId/s);
});

test("PR14 Partner Admin vede il team solo della propria società", () => {
  assert.match(partnerSession, /actor\.role === "PARTNER_ADMIN"/);
  assert.match(partnerSession, /eq\(users\.partnerId, actor\.partnerId\)/);
  assert.match(partnerPage, /Collaboratori della tua società/);
});

test("PR14 preview è server-safe e documenta il 403 fuori perimetro", () => {
  assert.match(preview, /SERVER-SAFE · ZERO JS/);
  assert.match(preview, /403 se fuori perimetro/);
  assert.match(preview, /Accesso Partner negato/);
});
