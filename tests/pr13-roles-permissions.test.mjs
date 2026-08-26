import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const permissions = await readFile(
  new URL("../app/lib/permissions.ts", import.meta.url),
  "utf8",
);
const authz = await readFile(
  new URL("../app/lib/server/authz.ts", import.meta.url),
  "utf8",
);
const hubSso = await readFile(
  new URL("../app/api/auth/hub-sso/route.ts", import.meta.url),
  "utf8",
);
const partnerLogin = await readFile(
  new URL("../app/api/auth/partner-login/route.ts", import.meta.url),
  "utf8",
);
const preview = await readFile(
  new URL("../app/pr13-roles-permissions-demo/page.tsx", import.meta.url),
  "utf8",
);
const docs = await readFile(
  new URL("../docs/ACCOUNT_ROLES_PERMISSIONS_V1.md", import.meta.url),
  "utf8",
);

test("PR13 distingue ruoli interni, Partner Admin e Partner", () => {
  assert.match(permissions, /"NOLEGGIO_MANAGER"/);
  assert.match(permissions, /"NOLEGGIO_DEPUTY"/);
  assert.match(permissions, /"NOLEGGIO_OPERATOR"/);
  assert.match(permissions, /"PARTNER_ADMIN"/);
  assert.match(permissions, /PARTNER_ADMIN:[\s\S]*"PARTNER_MANAGE_OWN_USERS"/);
  assert.match(permissions, /PARTNER:[\s\S]*"QUOTE_CREATE_OWN"/);
  assert.doesNotMatch(
    permissions.match(/PARTNER:\s*\[[\s\S]*?\],\n};/)?.[0] || "",
    /"QUOTE_APPROVE"/,
  );
});

test("PR13 rende i default realmente modificabili con override ON OFF", () => {
  assert.match(permissions, /if \(override\.enabled\) resolved\.add\(permission\)/);
  assert.match(permissions, /else resolved\.delete\(permission\)/);
  assert.match(authz, /enabled: userPermissionGrants\.enabled/);
  assert.doesNotMatch(authz, /eq\(userPermissionGrants\.enabled, true\)/);
});

test("PR13: CEO governa e Responsabile gestisce solo permessi ordinari Operatore", () => {
  assert.match(permissions, /CEO_GRANTABLE_INTERNAL_PERMISSIONS/);
  assert.match(permissions, /ORDINARY_OPERATOR_DELEGABLE_PERMISSIONS/);
  assert.match(permissions, /targetRole !== "NOLEGGIO_OPERATOR"/);
  assert.match(permissions, /"QUOTE_APPROVE"/);
  assert.match(permissions, /"QUOTE_PUBLISH"/);
  assert.match(permissions, /"COMMISSION_EDIT_ANY"/);
});

test("PR13 congela le decisioni operative approvate", () => {
  assert.match(permissions, /NOLEGGIO_MANAGER:[\s\S]*"PARTNER_ACTIVATE_ANY"/);
  assert.match(permissions, /"QUOTE_REACTIVATE_OWN"/);
  assert.match(permissions, /"QUOTE_RESTORE_ARCHIVED_ANY"/);
  assert.match(permissions, /"DOCUMENT_REMOVE_OWN"/);
  assert.match(permissions, /NOLEGGIO_DEPUTY:[\s\S]*"PRACTICE_VIEW_ALL"/);
  assert.match(docs, /Responsabile propone la creazione\/disattivazione di un Operatore ECCOMI; il CEO approva/);
  assert.match(docs, /importo della commissione può essere impostato o corretto solo dal CEO/);
});

test("PR13 Partner Admin mantiene ruolo e un account disattivato non viene riattivato dal login", () => {
  assert.match(partnerLogin, /Account Partner disattivato/);
  assert.match(partnerLogin, /existing\?\.role === "PARTNER_ADMIN" \? "PARTNER_ADMIN" : "PARTNER"/);
  assert.match(authz, /isPartnerNoleggioRole\(actor\.role\)/);
});

test("PR13 prepara HUB per Responsabile, Vice e Operatore senza fidarsi dei grants nel token", () => {
  assert.match(hubSso, /noleggio_manager: "NOLEGGIO_MANAGER"/);
  assert.match(hubSso, /noleggio_deputy: "NOLEGGIO_DEPUTY"/);
  assert.match(hubSso, /noleggio_operator: "NOLEGGIO_OPERATOR"/);
  assert.match(hubSso, /Non accettiamo grants arbitrari dal token/);
});

test("PR13 preview mostra matrice definitiva, account separati e nessun nome rimosso", () => {
  assert.match(preview, /MATRICE V1 DEFINITIVA/);
  assert.match(preview, /Le 10 decisioni approvate/);
  assert.match(preview, /PARTNER_ADMIN/);
  assert.match(preview, /Robin → Arcibaldo/);
  assert.match(preview, /SERVER-SAFE · ZERO JS/);
  assert.doesNotMatch(preview, /Tony/);
  assert.doesNotMatch(docs, /Tony/);
});
