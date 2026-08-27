import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("PR32 exposes a distinct DELETE action after access suspension", async () => {
  const page = await read("../app/ceo/partners/[id]/accessi/page.tsx");
  assert.match(page, /name="action" value="DELETE"/);
  assert.match(page, /Elimina accesso/);
  assert.match(page, /non blocca più la cancellazione del Partner/);
});

test("PR32 deletion is CEO-only, preview-safe and removes the Partner user relation", async () => {
  const route = await read("../app/api/ceo/partners/[id]/access/route.ts");
  assert.match(route, /requireCeo\(request\)/);
  assert.match(route, /isRenderPullRequestPreview\(request\)/);
  assert.match(route, /accessDeletePreview/);
  assert.match(route, /if \(user\.active\).*Disattiva prima/);
  assert.match(route, /db\.delete\(userPermissionGrants\)/);
  assert.match(route, /db\.delete\(users\)/);
  assert.match(route, /PARTNER_ACCESS_DELETED/);
});

test("PR32 keeps DISABLE and DELETE as separate lifecycle operations", async () => {
  const route = await read("../app/api/ceo/partners/[id]/access/route.ts");
  assert.match(route, /\["DISABLE", "DELETE"\]/);
  assert.match(route, /PARTNER_ACCESS_DISABLED/);
  assert.match(route, /PARTNER_ACCESS_DELETED/);
});
