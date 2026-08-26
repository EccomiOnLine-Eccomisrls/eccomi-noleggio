import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [partnerPage, partnerAuthz, partnerSession, dashboard, promotionService, promotionsRoute, practiceRoute, documentRoute, actionRoute, coverRoute, quoteRoute, preview, authProvider, inviteRoute, activateRoute, loginRoute, accessCenter, ceoPartnerPage] = await Promise.all([
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
  read("app/lib/server/partner-auth-provider.ts"),
  read("app/api/ceo/partners/[id]/invite/route.ts"),
  read("app/api/auth/partner-activate/route.ts"),
  read("app/api/auth/partner-login/route.ts"),
  read("app/ceo/partners/[id]/accessi/page.tsx"),
  read("app/ceo/partners/[id]/page.tsx"),
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

test("PR14 usa Supabase Auth e Resend senza password Partner condivisa", () => {
  assert.match(authProvider, /\/auth\/v1\/admin\/generate_link/);
  assert.match(authProvider, /hashed_token/);
  assert.match(authProvider, /\/auth\/v1\/verify/);
  assert.match(authProvider, /\/auth\/v1\/token\?grant_type=password/);
  assert.match(authProvider, /https:\/\/api\.resend\.com\/emails/);
  assert.doesNotMatch(loginRoute, /PARTNER_ACCESS_PASSWORD/);
  assert.match(loginRoute, /authenticatePartnerPassword/);
});

test("PR14 invito CEO crea account Partner Admin pending e invia link ECCOMI", () => {
  assert.match(inviteRoute, /requireCeo/);
  assert.match(inviteRoute, /generatePartnerActivationToken/);
  assert.match(inviteRoute, /role: "PARTNER_ADMIN"/);
  assert.match(inviteRoute, /active: false/);
  assert.match(inviteRoute, /sendPartnerActivationEmail/);
  assert.match(inviteRoute, /PARTNER_ADMIN_INVITED/);
});

test("PR14 attivazione verifica token hash, imposta password e attiva account locale", () => {
  assert.match(activateRoute, /verifyPartnerActivationToken/);
  assert.match(activateRoute, /setSupabasePassword/);
  assert.match(activateRoute, /active: true/);
  assert.match(activateRoute, /PARTNER_ACCOUNT_ACTIVATED/);
});

test("PR14 Centro Accessi espone onboarding e stati reali", () => {
  assert.match(accessCenter, /Invita Partner Admin/);
  assert.match(accessCenter, /INVITO INVIATO/);
  assert.match(accessCenter, /DISATTIVATO/);
  assert.match(accessCenter, /PARTNER_LOGIN/);
  assert.match(accessCenter, /Nessuna password condivisa/);
  assert.match(ceoPartnerPage, /Apri Centro Accessi/);
});

test("PR14 preview è server-safe e documenta onboarding e 403 fuori perimetro", () => {
  assert.match(preview, /SERVER-SAFE · ZERO JS/);
  assert.match(preview, /403 se fuori perimetro/);
  assert.match(preview, /Accesso Partner negato/);
  assert.match(preview, /Supabase Auth/);
  assert.match(preview, /Resend/);
  assert.match(preview, /INVITO INVIATO/);
  assert.match(preview, /NESSUNA PASSWORD CONDIVISA/);
});
