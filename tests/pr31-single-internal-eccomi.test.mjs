import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("PR31 server classification treats only exact ECCOMI name as internal", async () => {
  const code = await source("../app/lib/server/partner-control-rules.ts");
  assert.match(code, /name\.trim\(\)\.toUpperCase\(\) === "ECCOMI"/);
  assert.doesNotMatch(code, /normalizedLegalName === "ECCOMI SRLS"/);
  assert.doesNotMatch(code, /normalizedLegalName === "ECCOMI S\.R\.L\.S\."/);
});

test("PR31 shared partner identity does not classify by legal name", async () => {
  const code = await source("../app/lib/partner-identity.ts");
  assert.match(code, /normalize\(partner\.name\) === "ECCOMI"/);
  assert.doesNotMatch(code, /legalName === "ECCOMI SRLS"/);
  assert.doesNotMatch(code, /name\.startsWith\("ECCOMI "\)/);
});
