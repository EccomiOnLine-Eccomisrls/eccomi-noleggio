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
const preview = await readFile(
  new URL("../app/pr13-roles-permissions-demo/page.tsx", import.meta.url),
  "utf8",
);

test("PR13 distingue i ruoli interni dall'account partner", () => {
  assert.match(permissions, /"NOLEGGIO_MANAGER"/);
  assert.match(permissions, /"NOLEGGIO_DEPUTY"/);
  assert.match(permissions, /"NOLEGGIO_OPERATOR"/);
  assert.match(permissions, /PARTNER:[\s\S]*"QUOTE_CREATE_OWN"/);
  assert.doesNotMatch(
    permissions.match(/PARTNER:\s*\[[\s\S]*?\],\n};/)?.[0] || "",
    /"QUOTE_APPROVE"/,
  );
});

test("PR13 rende approvazione e pubblicazione delegabili solo dal CEO agli interni", () => {
  assert.match(permissions, /DELEGABLE_PERMISSIONS[\s\S]*"QUOTE_APPROVE"[\s\S]*"QUOTE_PUBLISH"/);
  assert.match(permissions, /targetRole === "CEO" \|\| targetRole === "PARTNER"/);
  assert.match(authz, /requirePermission\(request: Request, permission: NoleggioPermission\)/);
});

test("PR13 prepara HUB per Responsabile, Vice e Operatore senza fidarsi dei grants nel token", () => {
  assert.match(hubSso, /noleggio_manager: "NOLEGGIO_MANAGER"/);
  assert.match(hubSso, /noleggio_deputy: "NOLEGGIO_DEPUTY"/);
  assert.match(hubSso, /noleggio_operator: "NOLEGGIO_OPERATOR"/);
  assert.match(hubSso, /Non accettiamo grants arbitrari dal token/);
});

test("PR13 preview esplicita account separati e subentro del Responsabile", () => {
  assert.match(preview, /STESSA PERSONA · DUE IDENTITÀ OPERATIVE/);
  assert.match(preview, /Tony → Arcibaldo/);
  assert.match(preview, /Se ROSSA: CEO\/Responsabile può riassegnare/);
  assert.match(preview, /SERVER-SAFE · ZERO JS/);
});
