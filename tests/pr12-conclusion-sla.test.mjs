import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const rules = await readFile(
  new URL("../app/lib/server/partner-control-rules.ts", import.meta.url),
  "utf8",
);
const closure = await readFile(
  new URL("../app/lib/server/practice-workflow-closure.ts", import.meta.url),
  "utf8",
);
const page = await readFile(
  new URL("../app/ceo/practices/[id]/page.tsx", import.meta.url),
  "utf8",
);

test("PR12 attribuisce gli SLA partner a ECCOMI quando il workflow è interno", () => {
  assert.match(rules, /getPracticeSla\(status: string, updatedAt: string, internalEccomi = false\)/);
  assert.match(rules, /internalEccomi && rule\.owner === "PARTNER" \? "ECCOMI" : rule\.owner/);
  assert.match(page, /getPracticeSla\(practice\.status, practice\.updatedAt, internalEccomi\)/);
});

test("PR12 usa l'audit workflow per la conclusione reale", () => {
  assert.match(closure, /PRACTICE_STATUS_DELIVERED/);
  assert.match(closure, /PRACTICE_STATUS_ARCHIVED/);
  assert.match(closure, /const delivered = rows\.find/);
  assert.match(closure, /return archived\?\.createdAt \|\| legacyCompletedAt/);
  assert.match(page, /getPracticeWorkflowClosedAt\(practice\.id, practice\.status, practice\.completedAt\)/);
});
