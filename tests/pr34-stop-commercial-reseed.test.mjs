import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("app/lib/server/seed.ts", "utf8");

test("PR34 non ricrea Partner commerciali o promozioni cancellate", () => {
  assert.match(source, /id: "eccomi-direct"/);
  assert.doesNotMatch(source, /goal-rent/);
  assert.doesNotMatch(source, /db\.insert\(promotions\)/);
  assert.doesNotMatch(source, /promo-fiat-4022049326/);
});
